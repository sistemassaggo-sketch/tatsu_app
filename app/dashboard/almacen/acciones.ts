"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { registrarEventoAuditoria } from "@/lib/auditoria";
import { fechaCodigoColombia } from "@/lib/fechas";
import { TAG_REPORTES } from "@/lib/reportes";

// Descuenta existencias de un producto puntual (guarda atómica "existencias >= cantidad" para que
// dos legalizaciones concurrentes no dejen existencias negativas). `etiqueta` solo se usa para el
// mensaje de error, según si es el producto vendido o un subcomponente suyo.
async function descontarExistenciasProducto<T extends { $queryRaw: typeof prisma.$queryRaw }>(
  tx: T,
  productoId: number,
  cantidad: number,
  etiqueta: string,
) {
  const [{ filas }] = await tx.$queryRaw<{ filas: bigint }[]>`
    WITH actualizado AS (
      UPDATE public.productos
      SET existencias_anterior = existencias,
          existencias = existencias - ${cantidad},
          disponibilidad = (existencias - ${cantidad}) > 0
      WHERE id = ${productoId} AND existencias >= ${cantidad}
      RETURNING id
    )
    SELECT count(*) AS filas FROM actualizado
  `;

  if (Number(filas) === 0) {
    throw new Error(`No hay existencias suficientes ${etiqueta} para legalizar la cotización.`);
  }
}

// Al legalizarse una cotización se descuentan las existencias de cada producto vendido y, además,
// las de sus subcomponentes (según `cantidadRequeridaComponente` × la cantidad vendida) — un
// producto compuesto consume stock de sus partes al legalizarse. El color elegido (si lo hay) es
// solo informativo: no se rastrea stock por color, así que siempre se descuenta del producto.
async function descontarExistencias<T extends { $queryRaw: typeof prisma.$queryRaw; productoComponente: typeof prisma.productoComponente }>(
  tx: T,
  items: { productoId: number; cantidad: number; producto: { codigo: string } }[],
) {
  for (const { productoId, cantidad, producto } of items) {
    await descontarExistenciasProducto(tx, productoId, cantidad, `del producto ${producto.codigo}`);

    const componentes = await tx.productoComponente.findMany({
      where: { productoPadreId: productoId },
      select: { cantidadRequeridaComponente: true, productoComponente: { select: { id: true, codigo: true } } },
    });

    for (const { cantidadRequeridaComponente, productoComponente } of componentes) {
      await descontarExistenciasProducto(
        tx,
        productoComponente.id,
        cantidadRequeridaComponente * cantidad,
        `del componente ${productoComponente.codigo} (usado por ${producto.codigo})`,
      );
    }
  }
}

function generarCodigoLegalizacion() {
  const fechaCodigo = fechaCodigoColombia();
  return `LEG-${fechaCodigo}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

const permisosPermitidos = ["admin", "almacen"] as const;

export type EstadoAccionAlmacen = { ok: boolean; mensaje: string } | null;

const TOTAL_MINIMO = 500000;

export async function actualizarCotizacionAlmacen(
  _estadoPrevio: EstadoAccionAlmacen,
  formData: FormData,
): Promise<EstadoAccionAlmacen> {
  const sesion = await auth();
  const rolUsuario = sesion?.user?.role;

  if (!rolUsuario || !permisosPermitidos.includes(rolUsuario as (typeof permisosPermitidos)[number])) {
    return { ok: false, mensaje: "No tienes permisos para modificar cotizaciones." };
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "usuario";
  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return { ok: false, mensaje: "Cotización inválida." };
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: { items: { include: { producto: { select: { codigo: true } } } } },
  });

  if (!cotizacion) {
    return { ok: false, mensaje: "La cotización no existe." };
  }

  if (cotizacion.estado !== "CREADO") {
    return { ok: false, mensaje: "La cotización ya no está en estado CREADO." };
  }

  const cantidades = new Map<number, number>();
  const eliminados = new Map<number, boolean>();

  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("cantidad-")) {
      const cantidad = Number(valor);
      if (Number.isInteger(cantidad) && cantidad > 0) {
        cantidades.set(Number(clave.replace("cantidad-", "")), cantidad);
      }
    } else if (clave.startsWith("eliminado-")) {
      eliminados.set(Number(clave.replace("eliminado-", "")), String(valor) === "true");
    }
  }

  // Estado final de cada ítem, calculado en memoria antes de escribir nada.
  const itemsFinales = cotizacion.items.map((item) => {
    const eliminado = eliminados.get(item.id) ?? Boolean(item.eliminado);
    const cantidad = eliminado ? item.cantidad : (cantidades.get(item.id) ?? item.cantidad);
    return { item, eliminado, cantidad, subtotal: Number(item.precioUnitario) * cantidad };
  });

  const subtotal = itemsFinales
    .filter((entrada) => !entrada.eliminado)
    .reduce((total, entrada) => total + entrada.subtotal, 0);

  // El mínimo se valida sobre el total real que va a quedar: si es minorista, el subtotal duplicado.
  const totalParaMinimo = cotizacion.esMinorista ? subtotal * 2 : subtotal;

  if (totalParaMinimo < TOTAL_MINIMO) {
    return { ok: false, mensaje: "La cotización debe tener un total mínimo de $500.000 para poder guardarse." };
  }

  // Minorista y descuento son excluyentes: si es minorista no se toma descuento y el total se duplica.
  const porcentajeDescuento = !cotizacion.esMinorista && cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0;
  const nuevoTotal = cotizacion.esMinorista ? subtotal * 2 : subtotal - (subtotal * porcentajeDescuento) / 100;
  const estadoSiguiente = porcentajeDescuento > 0 ? "REVISION_ALMACEN" : "LEGALIZADO";
  const fechaEliminacion = new Date();

  let actualizada: boolean;

  try {
    actualizada = await prisma.$transaction(async (tx) => {
      const cambioEstado = await tx.cotizacion.updateMany({
        where: { id: cotizacionId, estado: "CREADO" },
        data: {
          estado: estadoSiguiente,
          total: nuevoTotal,
          ...(estadoSiguiente === "LEGALIZADO"
            ? { codigoLegalizacion: generarCodigoLegalizacion(), fechaLegalizacion: new Date() }
            : {}),
        },
      });

      if (cambioEstado.count === 0) {
        return false;
      }

      for (const { item, eliminado, cantidad, subtotal: subtotalItem } of itemsFinales) {
        await tx.itemCotizacion.update({
          where: { id: item.id },
          data: eliminado
            ? {
                eliminado: true,
                eliminadoPor: item.eliminado ? item.eliminadoPor : nombreUsuario,
                fechaEliminacion: item.eliminado ? item.fechaEliminacion : fechaEliminacion,
              }
            : {
                cantidad,
                subtotal: subtotalItem,
                eliminado: false,
                eliminadoPor: null,
                fechaEliminacion: null,
              },
        });
      }

      if (estadoSiguiente === "LEGALIZADO") {
        await descontarExistencias(
          tx,
          itemsFinales
            .filter((entrada) => !entrada.eliminado)
            .map(({ item, cantidad }) => ({ productoId: item.productoId, cantidad, producto: item.producto })),
        );
      }

      return true;
    });
  } catch (error) {
    return { ok: false, mensaje: error instanceof Error ? error.message : "No fue posible actualizar las existencias." };
  }

  if (!actualizada) {
    return { ok: false, mensaje: "La cotización cambió de estado mientras la editabas." };
  }

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_COTIZACION",
    descripcion: `Se actualizó la cotización #${cotizacion.codigo} en almacén y quedó en estado ${estadoSiguiente}.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

  revalidatePath("/dashboard/almacen");
  revalidatePath(`/dashboard/almacen/${cotizacionId}`);
  if (estadoSiguiente === "LEGALIZADO") {
    revalidateTag(TAG_REPORTES, "max");
  }

  return { ok: true, mensaje: "Cotización actualizada." };
}

// Almacén devuelve una cotización CREADO al vendedor/cliente que la hizo (p. ej. faltan datos o hay
// que ajustar productos) en vez de procesarla. Queda en DEVUELTO_DESDE_ALMACEN, editable por su dueño
// en /dashboard/cotizaciones/devueltas, desde donde se reenvía y vuelve a CREADO para que almacén la
// revise de nuevo.
export async function devolverCotizacionAlmacen(
  _estadoPrevio: EstadoAccionAlmacen,
  formData: FormData,
): Promise<EstadoAccionAlmacen> {
  const sesion = await auth();
  const rolUsuario = sesion?.user?.role;

  if (!rolUsuario || !permisosPermitidos.includes(rolUsuario as (typeof permisosPermitidos)[number])) {
    return { ok: false, mensaje: "No tienes permisos para devolver cotizaciones." };
  }

  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return { ok: false, mensaje: "Cotización inválida." };
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "usuario";

  const resultado = await prisma.cotizacion.updateMany({
    where: { id: cotizacionId, estado: "CREADO" },
    data: { estado: "DEVUELTO_DESDE_ALMACEN" },
  });

  if (resultado.count === 0) {
    return { ok: false, mensaje: "La cotización ya no está en estado CREADO." };
  }

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "DEVOLVER_COTIZACION",
    descripcion: `Se devolvió la cotización #${cotizacionId} desde almacén para que el vendedor la corrija.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

  revalidatePath("/dashboard/almacen");
  revalidatePath(`/dashboard/almacen/${cotizacionId}`);
  revalidatePath("/dashboard/cotizaciones/devueltas");

  return { ok: true, mensaje: "Cotización devuelta." };
}

export async function aprobarCotizacion(
  _estadoPrevio: EstadoAccionAlmacen,
  formData: FormData,
): Promise<EstadoAccionAlmacen> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para aprobar cotizaciones." };
  }

  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return { ok: false, mensaje: "Cotización inválida." };
  }

  const usuario = sesion.user.username ?? sesion.user.name ?? "admin";

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const cambioEstado = await tx.cotizacion.updateMany({
        where: { id: cotizacionId, estado: "REVISION_ALMACEN" },
        // Al aprobarse el precio, la cotización se legaliza de inmediato.
        data: { estado: "LEGALIZADO", codigoLegalizacion: generarCodigoLegalizacion(), fechaLegalizacion: new Date() },
      });

      if (cambioEstado.count === 0) {
        return false;
      }

      const items = await tx.itemCotizacion.findMany({
        where: { cotizacionId, eliminado: false },
        select: { productoId: true, cantidad: true, producto: { select: { codigo: true } } },
      });

      await descontarExistencias(tx, items);

      return true;
    });

    if (!resultado) {
      return { ok: false, mensaje: "La cotización ya no está en revisión de almacén." };
    }
  } catch (error) {
    return {
      ok: false,
      mensaje: error instanceof Error ? error.message : "No fue posible aprobar la cotización.",
    };
  }

  await registrarEventoAuditoria({
    usuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "APROBAR_COTIZACION",
    descripcion: `El administrador ${usuario} aprobó la cotización #${cotizacionId} y quedó en estado LEGALIZADO.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

  revalidatePath("/dashboard/legalizaciones");
  revalidateTag(TAG_REPORTES, "max");
  revalidatePath("/dashboard/aprobacion-precios");
  revalidatePath("/dashboard/almacen");

  return { ok: true, mensaje: "Cotización aprobada y legalizada." };
}

export async function cancelarCotizacion(
  _estadoPrevio: EstadoAccionAlmacen,
  formData: FormData,
): Promise<EstadoAccionAlmacen> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para rechazar cotizaciones." };
  }

  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return { ok: false, mensaje: "Cotización inválida." };
  }

  const usuario = sesion.user.username ?? sesion.user.name ?? "admin";

  const resultado = await prisma.cotizacion.updateMany({
    where: { id: cotizacionId, estado: "REVISION_ALMACEN" },
    data: { estado: "NO_APROBADO" },
  });

  if (resultado.count === 0) {
    return { ok: false, mensaje: "La cotización ya no está en revisión de almacén." };
  }

  await registrarEventoAuditoria({
    usuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "RECHAZAR_COTIZACION",
    descripcion: `El administrador ${usuario} rechazó la cotización #${cotizacionId}.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

  revalidatePath("/dashboard/aprobacion-precios");
  revalidatePath("/dashboard/almacen");

  return { ok: true, mensaje: "Cotización rechazada." };
}
