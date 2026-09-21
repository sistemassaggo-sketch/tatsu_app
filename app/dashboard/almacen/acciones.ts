"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "node:crypto";
import { registrarEventoAuditoria } from "@/lib/auditoria";
import { fechaCodigoColombia } from "@/lib/fechas";

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
    include: { items: true },
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

  if (subtotal < TOTAL_MINIMO) {
    return { ok: false, mensaje: "La cotización debe tener un total mínimo de $500.000 para poder guardarse." };
  }

  const porcentajeDescuento = cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0;
  const nuevoTotal = subtotal - (subtotal * porcentajeDescuento) / 100;
  const estadoSiguiente = porcentajeDescuento > 0 ? "REVISION_ALMACEN" : "LEGALIZADO";
  const fechaEliminacion = new Date();

  const actualizada = await prisma.$transaction(async (tx) => {
    const cambioEstado = await tx.cotizacion.updateMany({
      where: { id: cotizacionId, estado: "CREADO" },
      data: {
        estado: estadoSiguiente,
        total: nuevoTotal,
        ...(estadoSiguiente === "LEGALIZADO" ? { codigoLegalizacion: generarCodigoLegalizacion() } : {}),
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

    return true;
  });

  if (!actualizada) {
    return { ok: false, mensaje: "La cotización cambió de estado mientras la editabas." };
  }

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_COTIZACION",
    descripcion: `Se actualizó la cotización #${cotizacionId} en almacén y quedó en estado ${estadoSiguiente}.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

  revalidatePath("/dashboard/almacen");
  revalidatePath(`/dashboard/almacen/${cotizacionId}`);

  return { ok: true, mensaje: "Cotización actualizada." };
}

export async function aprobarCotizacion(formData: FormData) {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return;
  }

  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return;
  }

  const usuario = sesion.user.username ?? sesion.user.name ?? "admin";

  const resultado = await prisma.cotizacion.updateMany({
    where: { id: cotizacionId, estado: "REVISION_ALMACEN" },
    // Al aprobarse el precio, la cotización se legaliza de inmediato.
    data: { estado: "LEGALIZADO", codigoLegalizacion: generarCodigoLegalizacion() },
  });

  if (resultado.count === 0) {
    return;
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
  revalidatePath("/dashboard/aprobacion-precios");
  revalidatePath("/dashboard/almacen");
}

export async function cancelarCotizacion(formData: FormData) {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return;
  }

  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return;
  }

  const usuario = sesion.user.username ?? sesion.user.name ?? "admin";

  const resultado = await prisma.cotizacion.updateMany({
    where: { id: cotizacionId, estado: "REVISION_ALMACEN" },
    data: { estado: "NO_APROBADO" },
  });

  if (resultado.count === 0) {
    return;
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
}
