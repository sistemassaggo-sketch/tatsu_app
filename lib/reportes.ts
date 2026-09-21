import "server-only";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { ZONA_HORARIA } from "@/lib/fechas";

const MESES_A_MOSTRAR = 12;
const PRODUCTOS_A_MOSTRAR = 10;

export type VentaMensual = { mes: string; etiqueta: string; total: number; legalizaciones: number };
export type ProductoVendido = { id: number; codigo: string; descripcion: string; unidades: number };
export type DatosReportes = { ventasPorMes: VentaMensual[]; productosMasVendidos: ProductoVendido[]; generadoEn: string };

// Las agregaciones se hacen en PostgreSQL: solo viajan unas pocas filas resumidas, no las cotizaciones completas.
async function consultarReportes(): Promise<DatosReportes> {
  const [ventas, productos] = await Promise.all([
    // Legalizaciones por mes (hora de Colombia) de los últimos 12 meses. `total` ya incluye el descuento.
    prisma.$queryRaw<{ mes: string; total: number; legalizaciones: number }[]>`
      SELECT to_char(date_trunc('month', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}), 'YYYY-MM') AS mes,
             COALESCE(SUM(total), 0)::float8 AS total,
             COUNT(*)::int AS legalizaciones
      FROM cotizaciones
      WHERE estado = 'LEGALIZADO'
        AND fecha_creacion >= ((date_trunc('month', now() AT TIME ZONE ${ZONA_HORARIA}) - make_interval(months => ${MESES_A_MOSTRAR - 1}))
                               AT TIME ZONE ${ZONA_HORARIA}) AT TIME ZONE 'UTC'
      GROUP BY 1
      ORDER BY 1`,
    // Productos más vendidos en legalizaciones (sin contar ítems eliminados).
    prisma.$queryRaw<{ id: number; codigo: string; descripcion: string; unidades: number }[]>`
      SELECT p.id, p.codigo, p.descripcion_original AS descripcion, SUM(i.cantidad)::int AS unidades
      FROM item_cotizacion i
      JOIN cotizaciones c ON c.id = i.cotizacion_id
      JOIN productos p ON p.id = i.producto_id
      WHERE c.estado = 'LEGALIZADO' AND i.eliminado = false
      GROUP BY p.id, p.codigo, p.descripcion_original
      ORDER BY unidades DESC, p.codigo
      LIMIT ${PRODUCTOS_A_MOSTRAR}`,
  ]);

  return {
    ventasPorMes: completarMeses(ventas),
    productosMasVendidos: productos,
    generadoEn: new Date().toISOString(),
  };
}

// Devuelve los últimos 12 meses (aunque no tengan ventas) para que el eje X sea continuo.
function completarMeses(filas: { mes: string; total: number; legalizaciones: number }[]): VentaMensual[] {
  const porMes = new Map(filas.map((fila) => [fila.mes, fila]));
  const partes = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: ZONA_HORARIA }).formatToParts(new Date());
  const anioActual = Number(partes.find((parte) => parte.type === "year")?.value);
  const mesActual = Number(partes.find((parte) => parte.type === "month")?.value);
  const etiquetador = new Intl.DateTimeFormat("es-CO", { month: "short", year: "2-digit", timeZone: "UTC" });

  return Array.from({ length: MESES_A_MOSTRAR }, (_, indice) => {
    const fecha = new Date(Date.UTC(anioActual, mesActual - 1 - (MESES_A_MOSTRAR - 1 - indice), 1));
    const clave = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
    const fila = porMes.get(clave);

    return {
      mes: clave,
      etiqueta: etiquetador.format(fecha).replace(".", ""),
      total: fila?.total ?? 0,
      legalizaciones: fila?.legalizaciones ?? 0,
    };
  });
}

export const TAG_REPORTES = "reportes";

// Los datos no dependen del usuario, así que se comparten en caché durante 5 minutos:
// abrir el módulo repetidamente no vuelve a consultar la base de datos.
export const obtenerReportes = unstable_cache(consultarReportes, ["reportes-ventas-v1"], {
  revalidate: 300,
  tags: [TAG_REPORTES],
});
