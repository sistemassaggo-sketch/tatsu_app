import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export type TipoEventoAuditoria =
  | "INICIO_SESION"
  | "CREAR_COTIZACION"
  | "MODIFICAR_COTIZACION"
  | "APROBAR_COTIZACION"
  | "RECHAZAR_COTIZACION";

export async function registrarEventoAuditoria({
  usuario,
  usuarioId,
  accion,
  descripcion,
  recurso,
  recursoId,
}: {
  usuario: string;
  usuarioId?: number | null;
  accion: TipoEventoAuditoria;
  descripcion: string;
  recurso: string;
  recursoId?: number | null;
}) {
  try {
    const cabeceras = await headers();
    const ip = cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() ?? cabeceras.get("x-real-ip") ?? "Desconocida";

    await prisma.auditoriaEvento.create({
      data: {
        usuario,
        usuarioId: usuarioId ?? null,
        accion,
        descripcion,
        ip,
        recurso,
        recursoId: recursoId ?? null,
      },
    });
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
}
