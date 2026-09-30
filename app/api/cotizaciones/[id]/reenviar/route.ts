import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/app/auth";
import { registrarEventoAuditoria } from "@/lib/auditoria";

const TOTAL_MINIMO = 500000;

type ItemEntrada = {
  itemId?: number | string;
  productoId?: number | string;
  cantidad?: number | string;
  colorId?: number | string | null;
  apliqueId?: number | string | null;
  eliminar?: boolean;
};

// Recalcula precio/disponibilidad/color/aplique contra el catálogo actual, igual que al crear una
// cotización: nunca se confía en lo que venga del cliente.
async function validarProducto(productoId: number, colorId: number | null, apliqueId: number | null, cantidad: number) {
  const producto = await prisma.producto.findUnique({
    where: { id: productoId },
    include: {
      colores: { where: { color: { activo: true } } },
      apliques: { where: { aplique: { activo: true } } },
    },
  });

  if (!producto) {
    throw new Error(`El producto con id ${productoId} no existe.`);
  }

  if (producto.precioBaseCop == null) {
    throw new Error(`El producto ${producto.codigo} no tiene precio base.`);
  }

  if (producto.colores.length > 0) {
    if (colorId == null) {
      throw new Error(`Debes elegir un color para el producto ${producto.codigo}.`);
    }

    if (!producto.colores.some((pc) => pc.colorId === colorId)) {
      throw new Error(`El color elegido no está disponible para el producto ${producto.codigo}.`);
    }
  }

  if (apliqueId != null && !producto.apliques.some((pa) => pa.apliqueId === apliqueId)) {
    throw new Error(`El aplique elegido no está disponible para el producto ${producto.codigo}.`);
  }

  if (!producto.disponibilidad) {
    throw new Error(`El producto ${producto.codigo} no está disponible.`);
  }

  if (producto.existencias < cantidad) {
    throw new Error(`El producto ${producto.codigo} no tiene existencias suficientes (disponibles: ${producto.existencias}).`);
  }

  return { codigo: producto.codigo, precioUnitario: Number(producto.precioBaseCop) };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sesion = await auth();

    if (!sesion?.user) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }

    // Admin y comercial son responsables de corregir cualquier cotización devuelta.
    if (!["admin", "comercial"].includes(sesion.user.role ?? "")) {
      return NextResponse.json({ message: "No tienes permisos para editar cotizaciones." }, { status: 403 });
    }

    const { id } = await params;
    const cotizacionId = Number(id);

    if (!Number.isInteger(cotizacionId)) {
      return NextResponse.json({ message: "Cotización inválida." }, { status: 400 });
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: { items: true },
    });

    if (!cotizacion) {
      return NextResponse.json({ message: "La cotización no existe." }, { status: 404 });
    }

    if (cotizacion.estado !== "DEVUELTO_DESDE_ALMACEN") {
      return NextResponse.json({ message: "La cotización ya no está devuelta desde almacén." }, { status: 400 });
    }

    const cuerpo = await request.json();
    const entradas: ItemEntrada[] = Array.isArray(cuerpo.items) ? cuerpo.items : [];

    const itemsExistentesPorId = new Map(cotizacion.items.map((item) => [item.id, item]));
    const idsVistos = new Set<number>();

    const itemsAEliminar: number[] = [];
    const itemsAActualizar: { id: number; cantidad: number; precioUnitario: number }[] = [];
    const itemsARestaurar: { id: number; cantidad: number; precioUnitario: number }[] = [];
    const itemsNuevos: { productoId: number; colorId: number | null; apliqueId: number | null; cantidad: number; precioUnitario: number }[] = [];

    for (const entrada of entradas) {
      const cantidad = Number(entrada.cantidad ?? 1);
      const colorId = entrada.colorId != null && entrada.colorId !== "" ? Number(entrada.colorId) : null;
      const apliqueId = entrada.apliqueId != null && entrada.apliqueId !== "" ? Number(entrada.apliqueId) : null;

      if (entrada.itemId != null) {
        const itemId = Number(entrada.itemId);
        const itemExistente = itemsExistentesPorId.get(itemId);

        if (!itemExistente) {
          return NextResponse.json({ message: "Uno de los productos ya no pertenece a esta cotización." }, { status: 400 });
        }

        idsVistos.add(itemId);

        const yaEliminado = itemExistente.eliminado;
        const debeQuedarEliminado = Boolean(entrada.eliminar);

        // Ya estaba eliminado (p. ej. por almacén) y sigue eliminado: no se toca, para conservar quién
        // y cuándo lo eliminó en vez de reescribirlo con el usuario que reenvía.
        if (yaEliminado && debeQuedarEliminado) {
          continue;
        }

        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          return NextResponse.json({ message: "Hay productos con una cantidad inválida." }, { status: 400 });
        }

        if (debeQuedarEliminado) {
          itemsAEliminar.push(itemId);
          continue;
        }

        // Debe quedar activo, estuviera o no eliminado antes: se revalida contra el catálogo actual.
        const { precioUnitario } = await validarProducto(itemExistente.productoId, itemExistente.colorId, itemExistente.apliqueId, cantidad);

        if (yaEliminado) {
          itemsARestaurar.push({ id: itemId, cantidad, precioUnitario });
        } else {
          itemsAActualizar.push({ id: itemId, cantidad, precioUnitario });
        }

        continue;
      }

      const productoId = Number(entrada.productoId);

      if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
        return NextResponse.json({ message: "Hay productos con datos inválidos." }, { status: 400 });
      }

      const { precioUnitario } = await validarProducto(productoId, colorId, apliqueId, cantidad);
      itemsNuevos.push({ productoId, colorId, apliqueId, cantidad, precioUnitario });
    }

    // Cualquier ítem existente que no vino en la solicitud se mantiene tal cual (mismo comportamiento
    // que el editor de almacén: solo se toca lo que el formulario envía).
    const subtotalExistentesSinTocar = cotizacion.items
      .filter((item) => !item.eliminado && !idsVistos.has(item.id))
      .reduce((total, item) => total + Number(item.subtotal), 0);

    const subtotalActualizados = itemsAActualizar.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
    const subtotalRestaurados = itemsARestaurar.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
    const subtotalNuevos = itemsNuevos.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
    const subtotal = subtotalExistentesSinTocar + subtotalActualizados + subtotalRestaurados + subtotalNuevos;

    if (subtotal <= 0) {
      return NextResponse.json({ message: "La cotización debe tener al menos un producto." }, { status: 400 });
    }

    const porcentajeDescuento = !cotizacion.esMinorista && cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0;
    const nuevoTotal = cotizacion.esMinorista ? subtotal * 2 : subtotal - (subtotal * porcentajeDescuento) / 100;

    if (nuevoTotal < TOTAL_MINIMO) {
      return NextResponse.json({ message: "La cotización debe tener un total mínimo de $500.000 para poder reenviarse." }, { status: 400 });
    }

    const fechaEliminacion = new Date();
    const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "usuario";

    const actualizada = await prisma.$transaction(async (tx) => {
      const cambioEstado = await tx.cotizacion.updateMany({
        where: { id: cotizacionId, estado: "DEVUELTO_DESDE_ALMACEN" },
        data: { estado: "CREADO", total: nuevoTotal },
      });

      if (cambioEstado.count === 0) {
        return false;
      }

      for (const itemId of itemsAEliminar) {
        await tx.itemCotizacion.update({
          where: { id: itemId },
          data: { eliminado: true, eliminadoPor: nombreUsuario, fechaEliminacion },
        });
      }

      for (const { id: itemId, cantidad, precioUnitario } of itemsAActualizar) {
        await tx.itemCotizacion.update({
          where: { id: itemId },
          data: { cantidad, precioUnitario, subtotal: precioUnitario * cantidad },
        });
      }

      for (const { id: itemId, cantidad, precioUnitario } of itemsARestaurar) {
        await tx.itemCotizacion.update({
          where: { id: itemId },
          data: { eliminado: false, eliminadoPor: null, fechaEliminacion: null, cantidad, precioUnitario, subtotal: precioUnitario * cantidad },
        });
      }

      if (itemsNuevos.length > 0) {
        await tx.itemCotizacion.createMany({
          data: itemsNuevos.map((item) => ({
            cotizacionId,
            productoId: item.productoId,
            colorId: item.colorId,
            apliqueId: item.apliqueId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.precioUnitario * item.cantidad,
          })),
        });
      }

      return true;
    });

    if (!actualizada) {
      return NextResponse.json({ message: "La cotización cambió de estado mientras la editabas." }, { status: 409 });
    }

    await registrarEventoAuditoria({
      usuario: nombreUsuario,
      usuarioId: Number((sesion.user as { id?: string }).id ?? 0) || null,
      accion: "REENVIAR_COTIZACION",
      descripcion: `Se reenvió la cotización #${cotizacion.codigo} a almacén tras corregirla.`,
      recurso: "cotizaciones",
      recursoId: cotizacionId,
    });

    return NextResponse.json({ ok: true, cotizacionId, total: nuevoTotal });
  } catch (error) {
    console.error("Error reenviando cotización:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "No fue posible reenviar la cotización." },
      { status: 500 },
    );
  }
}
