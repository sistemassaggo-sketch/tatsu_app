import "server-only";

import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import { ZONA_HORARIA, anioActualColombia } from "@/lib/fechas";

const PRODUCTOS_A_MOSTRAR = 10;

export type VentaMensual = { mes: string; etiqueta: string; total: number; legalizaciones: number };
export type ProductoVendido = { id: number; codigo: string; descripcion: string; unidades: number };
export type ComparativoMensual = { mes: string; etiqueta: string; cotizaciones: number; legalizaciones: number };
export type DatosReportes = {
  ventasPorMes: VentaMensual[];
  productosMasVendidos: ProductoVendido[];
  tipoVenta: TipoVenta;
  comparativoMensual: ComparativoMensual[];
  generadoEn: string;
};
export type TipoVenta = { minoristas: number; mayoristas: number}

// Los 12 meses del año elegido (clave "AAAA-MM" + etiqueta corta), para que cualquier gráfico mensual
// tenga un eje X continuo aunque algún mes no tenga datos.
function mesesDelAnio(anio: number) {
  const etiquetador = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

  return Array.from({ length: 12 }, (_, indice) => {
    const fecha = new Date(Date.UTC(anio, indice, 1));

    return {
      mes: `${anio}-${String(indice + 1).padStart(2, "0")}`,
      etiqueta: etiquetador.format(fecha).replace(".", ""),
    };
  });
}

// Las agregaciones se hacen en PostgreSQL: solo viajan unas pocas filas resumidas, no las cotizaciones completas.
// Todo se filtra por año (hora de Colombia) de la fecha de creación de la legalización.
async function consultarReportes(anio: number): Promise<DatosReportes> {
  const [ventas, productos, tipoVentas, cotizacionesCreadas] = await Promise.all([
    // Legalizaciones por mes (hora de Colombia) del año elegido.
    prisma.$queryRaw<{ mes: string; total: number; legalizaciones: number }[]>`
      SELECT to_char(date_trunc('month', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}), 'YYYY-MM') AS mes,
             COALESCE(SUM(total), 0)::float8 AS total,
             COUNT(*)::int AS legalizaciones
      FROM public.cotizaciones
      WHERE estado = 'LEGALIZADO'
        AND date_part('year', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}) = ${anio}
      GROUP BY 1
      ORDER BY 1`,
    // Productos más vendidos en legalizaciones del año elegido (sin contar ítems eliminados).
    prisma.$queryRaw<{ id: number; codigo: string; descripcion: string; unidades: number }[]>`
      SELECT p.id, p.codigo, p.descripcion_original AS descripcion, SUM(i.cantidad)::int AS unidades
      FROM public.item_cotizacion i
      JOIN public.cotizaciones c ON c.id = i.cotizacion_id
      JOIN public.productos p ON p.id = i.producto_id
      WHERE c.estado = 'LEGALIZADO' AND i.eliminado = false
        AND date_part('year', (c.fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}) = ${anio}
      GROUP BY p.id, p.codigo, p.descripcion_original
      ORDER BY unidades DESC, p.codigo
      LIMIT ${PRODUCTOS_A_MOSTRAR}`,
    // Discriminación por tipo de venta del año elegido.
    prisma.$queryRaw<{ minoristas: number; mayoristas: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE es_minorista = true)::int AS minoristas,
        COUNT(*) FILTER (WHERE es_minorista = false)::int AS mayoristas
      FROM public.cotizaciones
      WHERE estado = 'LEGALIZADO'
        AND date_part('year', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}) = ${anio}`,
    // Cotizaciones creadas por mes del año elegido, sin importar en qué estado hayan quedado (para
    // compararlas contra las que sí se legalizaron ese mismo mes).
    prisma.$queryRaw<{ mes: string; cotizaciones: number }[]>`
      SELECT to_char(date_trunc('month', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}), 'YYYY-MM') AS mes,
             COUNT(*)::int AS cotizaciones
      FROM public.cotizaciones
      WHERE eliminado = false
        AND date_part('year', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA}) = ${anio}
      GROUP BY 1
      ORDER BY 1`,
  ]);

  return {
    ventasPorMes: completarMeses(ventas, anio),
    productosMasVendidos: productos,
    tipoVenta: tipoVentas[0] ?? { minoristas: 0, mayoristas: 0 },
    comparativoMensual: completarComparativoMensual(cotizacionesCreadas, ventas, anio),
    generadoEn: new Date().toISOString(),
  };
}

// Devuelve los 12 meses del año elegido (aunque no tengan ventas) para que el eje X sea continuo.
function completarMeses(filas: { mes: string; total: number; legalizaciones: number }[], anio: number): VentaMensual[] {
  const porMes = new Map(filas.map((fila) => [fila.mes, fila]));

  return mesesDelAnio(anio).map(({ mes, etiqueta }) => {
    const fila = porMes.get(mes);

    return {
      mes,
      etiqueta,
      total: fila?.total ?? 0,
      legalizaciones: fila?.legalizaciones ?? 0,
    };
  });
}

// Junta, mes a mes, cuántas cotizaciones se crearon contra cuántas de ellas (u otras del mismo mes)
// terminaron legalizadas.
function completarComparativoMensual(
  cotizacionesFilas: { mes: string; cotizaciones: number }[],
  legalizacionesFilas: { mes: string; legalizaciones: number }[],
  anio: number,
): ComparativoMensual[] {
  const cotizacionesPorMes = new Map(cotizacionesFilas.map((fila) => [fila.mes, fila.cotizaciones]));
  const legalizacionesPorMes = new Map(legalizacionesFilas.map((fila) => [fila.mes, fila.legalizaciones]));

  return mesesDelAnio(anio).map(({ mes, etiqueta }) => ({
    mes,
    etiqueta,
    cotizaciones: cotizacionesPorMes.get(mes) ?? 0,
    legalizaciones: legalizacionesPorMes.get(mes) ?? 0,
  }));
}

// Años (hora de Colombia) en los que hay al menos una legalización, más siempre el año actual (aunque
// todavía no tenga ninguna) para que el filtro nunca quede vacío.
async function consultarAniosDisponibles(): Promise<number[]> {
  const filas = await prisma.$queryRaw<{ anio: number }[]>`
    SELECT DISTINCT date_part('year', (fecha_creacion AT TIME ZONE 'UTC') AT TIME ZONE ${ZONA_HORARIA})::int AS anio
    FROM public.cotizaciones
    WHERE estado = 'LEGALIZADO'
    ORDER BY anio DESC`;

  const anioActual = anioActualColombia();
  const anios = filas.map((fila) => fila.anio);

  return anios.includes(anioActual) ? anios : [anioActual, ...anios];
}

export const TAG_REPORTES = "reportes";

// Los datos no dependen del usuario, así que se comparten en caché durante 5 minutos por año:
// abrir el módulo repetidamente (con el mismo año elegido) no vuelve a consultar la base de datos.
export const obtenerReportes = unstable_cache(consultarReportes, ["reportes-ventas-v3"], {
  revalidate: 300,
  tags: [TAG_REPORTES],
});

export const obtenerAniosDisponibles = unstable_cache(consultarAniosDisponibles, ["reportes-anios-v1"], {
  revalidate: 300,
  tags: [TAG_REPORTES],
});
