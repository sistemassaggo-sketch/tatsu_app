import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function generarCodigoCotizacion() {
  const fecha = new Date();
  const fechaCodigo = fecha.toISOString().slice(0, 10).replace(/-/g, "");
  const randomParte = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `COT-${fechaCodigo}-${randomParte}`;
}

type ItemCotizacionEntrada = {
  id?: number | string;
  cantidad?: number | string;
  precio?: number | string;
};

export async function POST(request: Request) {
  try {
    if (!prisma || !(prisma as typeof prisma & { cotizacion?: { create: (...args: any[]) => Promise<any> } }).cotizacion) {
      throw new Error("Prisma no está inicializado correctamente.");
    }

    const cuerpo = await request.json();
    const clienteId = Number(cuerpo.clienteId);
    const items: ItemCotizacionEntrada[] = Array.isArray(cuerpo.items) ? cuerpo.items : [];
    const descuentoActivo = Boolean(cuerpo.descuentoActivo);
    const descuentoPorcentaje = Number(cuerpo.descuentoPorcentaje ?? 0);

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
        const precioUnitario = Number(item.precio ?? 0);

        if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error("Hay productos con datos inválidos.");
        }

        const producto = await prisma.producto.findUnique({ where: { id: productoId } });

        if (!producto) {
          throw new Error(`El producto con id ${productoId} no existe.`);
        }

        return {
          productoId,
          cantidad,
          precioUnitario: Number(producto.precioBaseCop ?? precioUnitario),
        };
      }),
    );

    const subtotal = productosParaGuardar.reduce(
      (total, item) => total + item.precioUnitario * item.cantidad,
      0,
    );
    const descuento = descuentoActivo ? (subtotal * descuentoPorcentaje) / 100 : 0;
    const total = subtotal - descuento;

    const cotizacion = await prisma.cotizacion.create({
      data: {
        codigo: generarCodigoCotizacion(),
        clienteId,
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
