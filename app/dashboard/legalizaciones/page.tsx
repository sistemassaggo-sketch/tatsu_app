import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatearFechaHora } from "@/lib/fechas";

export default async function LegalizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busqueda = (q ?? "").trim();
  const session = await auth();

  if (!session?.user?.role || !["admin", "almacen", "comercial"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      estado: "LEGALIZADO",
      ...(busqueda ? { codigoLegalizacion: { contains: busqueda, mode: "insensitive" as const } } : {}),
    },
    include: { cliente: { select: { id: true, nombre: true } } },
    orderBy: { fechaCreacion: "desc" },
  });

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Legalizaciones</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>Cotizaciones en estado legalizado.</p>

      <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por código de legalización (o parte del código)"
          aria-label="Buscar por código de legalización"
          style={{
            flex: "1 1 260px",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "10px 12px",
            font: "inherit",
          }}
        />
        <button
          type="submit"
          style={{ border: "none", borderRadius: 8, background: "#176B87", color: "#fff", padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}
        >
          Buscar
        </button>
        {busqueda ? (
          <Link
            href="/dashboard/legalizaciones"
            style={{ border: "1px solid #176B87", borderRadius: 8, color: "#176B87", padding: "9px 14px", textDecoration: "none", fontWeight: 700 }}
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      {cotizaciones.length === 0 ? (
        <p style={{ color: "#475569" }}>
          {busqueda ? `No hay legalizaciones que coincidan con "${busqueda}".` : "No hay cotizaciones legalizadas."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {cotizaciones.map((cotizacion) => (
            <article
              key={cotizacion.id}
              style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: "#176B87" }}>{cotizacion.codigoLegalizacion ?? cotizacion.codigo}</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>Cliente: {cotizacion.cliente.nombre}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>Estado: LEGALIZADO</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>{formatearFechaHora(cotizacion.fechaCreacion)}</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 18, color: "#176B87" }}>
                  Total: {formatearCop(Number(cotizacion.total ?? 0))}
                </strong>
                <Link
                  href={`/dashboard/legalizaciones/${cotizacion.id}`}
                  style={{
                    border: "1px solid #176B87",
                    borderRadius: 8,
                    color: "#176B87",
                    padding: "9px 12px",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Ver detalle
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
}

