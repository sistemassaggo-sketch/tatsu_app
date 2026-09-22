import { headers } from "next/headers";
import prisma, { esErrorDeConexionCerrada } from "@/lib/prisma";

export type TipoEventoAuditoria =
  | "INICIO_SESION"
  | "CREAR_COTIZACION"
  | "MODIFICAR_COTIZACION"
  | "APROBAR_COTIZACION"
  | "RECHAZAR_COTIZACION"
  | "SOLICITAR_RESTABLECIMIENTO"
  | "RESTABLECER_CONTRASENA"
  | "MODIFICAR_PRODUCTO";

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

    const datos = {
      usuario,
      usuarioId: usuarioId ?? null,
      accion,
      descripcion,
      ip,
      recurso,
      recursoId: recursoId ?? null,
    };

    try {
      await prisma.auditoriaEvento.create({ data: datos });
    } catch (error) {
      // Si la conexión del pool estaba cerrada, el evento no llegó a guardarse: se reintenta una vez.
      if (!esErrorDeConexionCerrada(error)) {
        throw error;
      }

      await prisma.auditoriaEvento.create({ data: datos });
    }
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
}
