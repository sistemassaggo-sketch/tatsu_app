import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import { obtenerReportes, obtenerAniosDisponibles } from "@/lib/reportes";
import { formatearFechaHora, anioActualColombia } from "@/lib/fechas";
import GraficosReportes from "./GraficosReportes";
import SelectorAnioReportes from "./SelectorAnioReportes";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const parametros = await searchParams;
  const anioSolicitado = Number(parametros.anio);
  const anio = Number.isInteger(anioSolicitado) ? anioSolicitado : anioActualColombia();

  const [{ ventasPorMes, productosMasVendidos, tipoVenta, comparativoMensual, generadoEn }, aniosDisponibles] = await Promise.all([
    obtenerReportes(anio),
    obtenerAniosDisponibles(),
  ]);

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)" }}>Reportes</h2>
        <SelectorAnioReportes anios={aniosDisponibles} anioActual={anio} />
      </div>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Ventas y productos más vendidos a partir de las legalizaciones. Datos actualizados: {formatearFechaHora(generadoEn)}{" "}
        (se refrescan cada 5 minutos).
      </p>

      <GraficosReportes
        ventasPorMes={ventasPorMes}
        productosMasVendidos={productosMasVendidos}
        tipoVenta={tipoVenta}
        comparativoMensual={comparativoMensual}
        anio={anio}
      />
    </section>
  );
}
