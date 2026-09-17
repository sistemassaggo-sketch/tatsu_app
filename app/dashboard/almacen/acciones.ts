"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { registrarEventoAuditoria } from "@/lib/auditoria";

const permisosPermitidos = ["admin", "almacen"] as const;

function obtenerFechaColombiaActual() {
  const ahora = new Date();
  const formateador = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const partes = Object.fromEntries(
    formateador
      .formatToParts(ahora)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, parte.value]),
  );

  const anno = Number(partes.year ?? ahora.getFullYear());
  const mes = Number(partes.month ?? ahora.getMonth() + 1);
  const dia = Number(partes.day ?? ahora.getDate());
  const hora = Number(partes.hour ?? ahora.getHours());
  const minuto = Number(partes.minute ?? ahora.getMinutes());
  const segundo = Number(partes.second ?? ahora.getSeconds());

  return new Date(anno, mes - 1, dia, hora, minuto, segundo);
}

export async function actualizarCotizacionAlmacen(formData: FormData) {
  const sesion = await auth();
  const rolUsuario = sesion?.user?.role;

  if (!rolUsuario || !permisosPermitidos.includes(rolUsuario as (typeof permisosPermitidos)[number])) {
    return;
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "usuario";
  const cotizacionId = Number(formData.get("cotizacionId"));

  if (!Number.isInteger(cotizacionId)) {
    return;
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: { items: true },
  });

  if (!cotizacion) {
    return;
  }

  if (cotizacion.estado !== "CREADO") {
    return;
  }

  const entradasCantidad = Array.from(formData.entries())
    .filter(([clave]) => clave.startsWith("cantidad-"))
    .map(([clave, valor]) => {
      const itemId = Number(clave.replace("cantidad-", ""));
      const cantidad = Number(valor);
      return { itemId, cantidad };
    })
    .filter((entrada) => Number.isInteger(entrada.itemId) && Number.isFinite(entrada.cantidad) && entrada.cantidad > 0);

  const idsEliminados = Array.from(formData.entries())
    .filter(([clave]) => clave.startsWith("eliminado-"))
    .map(([clave, valor]) => ({
      itemId: Number(clave.replace("eliminado-", "")),
      eliminado: String(valor) === "true",
    }))
    .filter((entrada) => Number.isInteger(entrada.itemId));

  const idsPermitidos = new Set(cotizacion.items.map((item) => item.id));
  const cambios = entradasCantidad.filter((entrada) => idsPermitidos.has(entrada.itemId));
  const eliminaciones = idsEliminados.filter((entrada) => idsPermitidos.has(entrada.itemId));

  if (cambios.length === 0 && eliminaciones.length === 0) {
    return;
  }

  const operacionesActualizacion: Array<ReturnType<typeof prisma.itemCotizacion.update>> = [];

  for (const cambio of cambios) {
    const itemActual = cotizacion.items.find((item) => item.id === cambio.itemId);

    if (!itemActual) {
      continue;
    }

    operacionesActualizacion.push(
      prisma.itemCotizacion.update({
        where: { id: cambio.itemId },
        data: {
          cantidad: cambio.cantidad,
          subtotal: Number(itemActual.precioUnitario) * cambio.cantidad,
          eliminado: false,
          eliminadoPor: null,
          fechaEliminacion: null,
        },
      }),
    );
  }

  for (const eliminacion of eliminaciones) {
    const itemActual = cotizacion.items.find((item) => item.id === eliminacion.itemId);

    if (!itemActual) {
      continue;
    }

    if (!eliminacion.eliminado) {
      operacionesActualizacion.push(
        prisma.itemCotizacion.update({
          where: { id: eliminacion.itemId },
          data: {
            eliminado: false,
            eliminadoPor: null,
            fechaEliminacion: null,
          },
        }),
      );
      continue;
    }

    operacionesActualizacion.push(
      prisma.itemCotizacion.update({
        where: { id: eliminacion.itemId },
        data: {
          eliminado: true,
          eliminadoPor: nombreUsuario,
          fechaEliminacion: obtenerFechaColombiaActual(),
        },
      }),
    );
  }

  if (operacionesActualizacion.length > 0) {
    await prisma.$transaction(operacionesActualizacion);
  }

  const cotizacionActualizada = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: { items: true },
  });

  const nuevoTotal =
    cotizacionActualizada?.items
      .filter((item) => !item.eliminado)
      .reduce((total, item) => total + Number(item.subtotal), 0) ?? 0;

  if (nuevoTotal < 500000) {
    return;
  }

  const estadoSiguiente = cotizacion.descuentoActivo && Number(cotizacion.descuentoPorc ?? 0) > 0 ? "REVISION_ALMACEN" : "LEGALIZADO";

  await prisma.cotizacion.update({
    where: { id: cotizacionId },
    data: {
      estado: estadoSiguiente,
      total: nuevoTotal,
    },
  });

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: estadoSiguiente === "LEGALIZADO" ? "MODIFICAR_COTIZACION" : "MODIFICAR_COTIZACION",
    descripcion: `Se actualizó la cotización #${cotizacionId} en almacén y quedó en estado ${estadoSiguiente}.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

  revalidatePath("/dashboard/almacen");
  revalidatePath(`/dashboard/almacen/${cotizacionId}`);
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

  await prisma.cotizacion.update({
    where: { id: cotizacionId },
    data: { estado: "APROBACION_PRECIO" },
  });

  await registrarEventoAuditoria({
    usuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "APROBAR_COTIZACION",
    descripcion: `El administrador ${usuario} aprobó la cotización #${cotizacionId}.`,
    recurso: "cotizaciones",
    recursoId: cotizacionId,
  });

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

  await prisma.cotizacion.update({
    where: { id: cotizacionId },
    data: { estado: "NO_APROBADO" },
  });

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
