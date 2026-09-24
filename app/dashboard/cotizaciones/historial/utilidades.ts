import type { EstadoCotizacion } from "@/generated/prisma/client";

export const ESTADOS_HISTORIAL: EstadoCotizacion[] = [
  "CREADO",
  "REVISION_ALMACEN",
  "APROBACION_PRECIO",
  "NO_APROBADO",
  "LEGALIZADO"
];

export function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
}

export { formatearFechaHora as formatearFecha } from "@/lib/fechas";
