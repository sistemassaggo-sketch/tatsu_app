import { auth } from "@/app/auth";
import { redirect } from "next/navigation";
import { obtenerReportes } from "@/lib/reportes";
import { formatearFechaHora } from "@/lib/fechas";
import GraficosReportes from "./GraficosReportes";

export default async function ReportesPage() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const { ventasPorMes, productosMasVendidos, generadoEn } = await obtenerReportes();

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Reportes</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Ventas y productos más vendidos a partir de las legalizaciones. Datos actualizados: {formatearFechaHora(generadoEn)}{" "}
        (se refrescan cada 5 minutos).
      </p>

      <GraficosReportes ventasPorMes={ventasPorMes} productosMasVendidos={productosMasVendidos} />
    </section>
  );
}
