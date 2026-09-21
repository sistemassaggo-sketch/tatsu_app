import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/app/auth";
import { fechaCodigoColombia } from "@/lib/fechas";
import { registrarEventoAuditoria } from "@/lib/auditoria";

function generarCodigoCotizacion() {
  const fechaCodigo = fechaCodigoColombia();
  const randomParte = randomBytes(4).toString("hex").toUpperCase();
  return `COT-${fechaCodigo}-${randomParte}`;
}

type ItemCotizacionEntrada = {
  id?: number | string;
  cantidad?: number | string;
};

export async function POST(request: Request) {
  try {
    const sesion = await auth();

    if (!sesion?.user) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }

    if (!["admin", "comercial"].includes(sesion.user.role ?? "")) {
      return NextResponse.json({ message: "No tienes permisos para crear cotizaciones." }, { status: 403 });
    }

    const cuerpo = await request.json();
    const clienteId = Number(cuerpo.clienteId);
    const items: ItemCotizacionEntrada[] = Array.isArray(cuerpo.items) ? cuerpo.items : [];
    const descuentoActivo = Boolean(cuerpo.descuentoActivo);
    const descuentoPorcentaje = Number(cuerpo.descuentoPorcentaje ?? 0);

    if (!Number.isFinite(descuentoPorcentaje) || descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
      return NextResponse.json({ message: "El descuento debe estar entre 0 y 100." }, { status: 400 });
    }

    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      return NextResponse.json({ message: "Debe seleccionar un cliente válido." }, { status: 400 });
    }

    if (items.length === 0) {
      return NextResponse.json({ message: "La cotización debe tener al menos un producto." }, { status: 400 });
    }

    const clienteExiste = await prisma.cliente.findFirst({
      where: { id: clienteId, status: true },
    });

    if (!clienteExiste) {
      return NextResponse.json({ message: "El cliente no existe o está inactivo." }, { status: 400 });
    }

    const productosParaGuardar = await Promise.all(
      items.map(async (item: ItemCotizacionEntrada) => {
        const productoId = Number(item.id);
        const cantidad = Number(item.cantidad ?? 1);

        if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
          throw new Error("Hay productos con datos inválidos.");
        }

        const producto = await prisma.producto.findUnique({ where: { id: productoId } });

        if (!producto) {
          throw new Error(`El producto con id ${productoId} no existe.`);
        }

        if (producto.precioBaseCop == null) {
          throw new Error(`El producto ${producto.id} no tiene precio base.`);
        }

        return {
          productoId,
          cantidad,
          precioUnitario: Number(producto.precioBaseCop),
        };
      }),
    );

    const subtotal = productosParaGuardar.reduce(
      (total, item) => total + item.precioUnitario * item.cantidad,
      0,
    );
    const descuento = descuentoActivo ? (subtotal * descuentoPorcentaje) / 100 : 0;
    const total = subtotal - descuento;

    // Vendedor = el usuario con sesión iniciada.
    const nombreUsuarioSesion = sesion.user.username ?? "";
    const usuarioSesion = nombreUsuarioSesion
      ? await prisma.usuario.findUnique({ where: { username: nombreUsuarioSesion }, select: { id: true } })
      : null;

    const cotizacion = await prisma.cotizacion.create({
      data: {
        codigo: generarCodigoCotizacion(),
        vendedorId: usuarioSesion?.id ?? null,
        clienteId,
        estado: "CREADO",
        descuentoActivo,
        descuentoPorc: descuentoActivo ? descuentoPorcentaje : 0,
        total,
        items: {
          create: productosParaGuardar.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.precioUnitario * item.cantidad,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await registrarEventoAuditoria({
      usuario: sesion.user.username ?? sesion.user.name ?? "usuario",
      usuarioId: Number((sesion.user as { id?: string }).id ?? 0) || null,
      accion: "CREAR_COTIZACION",
      descripcion: `Se creó la cotización ${cotizacion.codigo} para el cliente ${clienteId}.`,
      recurso: "cotizaciones",
      recursoId: cotizacion.id,
    });

    return NextResponse.json({
      ok: true,
      cotizacionId: cotizacion.id,
      codigo: cotizacion.codigo,
      total: Number(cotizacion.total ?? 0),
    });
  } catch (error) {
    console.error("Error creando cotización:", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "No fue posible guardar la cotización.",
      },
      { status: 500 },
    );
  }
}
