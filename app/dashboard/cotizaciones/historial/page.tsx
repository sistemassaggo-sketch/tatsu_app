import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import BotonDescargarPdf from "../../BotonDescargarPdf";
import { ESTADOS_HISTORIAL, formatearCop, formatearFecha } from "./utilidades";

export default async function HistorialCotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.role || !["admin", "comercial"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const { q } = await searchParams;
  const busqueda = (q ?? "").trim();

  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      estado: { in: ESTADOS_HISTORIAL },
      ...(busqueda ? { codigo: { contains: busqueda, mode: "insensitive" as const } } : {}),
    },
    include: { cliente: { select: { nombre: true } } },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", margin: 0 }}>Historial de cotizaciones</h2>
        <Link href="/dashboard/cotizaciones" style={estiloBotonSecundario}>
          Volver a cotizaciones
        </Link>
      </div>
      <p style={{ color: "#475569", lineHeight: 1.7, margin: "8px 0 24px" }}>
        Cotizaciones en estado creado, revisión de almacén, aprobación de precio y no aprobado.
      </p>

      <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por código de cotización"
          aria-label="Buscar por código de cotización"
          style={{
            flex: "1 1 260px",
            minWidth: 0,
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
          <Link href="/dashboard/cotizaciones/historial" style={estiloBotonSecundario}>
            Limpiar
          </Link>
        ) : null}
      </form>

      {cotizaciones.length === 0 ? (
        <p style={{ color: "#475569" }}>
          {busqueda ? `No hay cotizaciones que coincidan con "${busqueda}".` : "No hay cotizaciones en el historial."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {cotizaciones.map((cotizacion) => (
            <article
              key={cotizacion.id}
              style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, color: "#176B87", overflowWrap: "anywhere" }}>{cotizacion.codigo}</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>Cliente: {cotizacion.cliente.nombre}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>Estado: {cotizacion.estado}</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>{formatearFecha(cotizacion.fechaCreacion)}</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 18, color: "#176B87" }}>
                  Total: {formatearCop(Number(cotizacion.total ?? 0))}
                </strong>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <BotonDescargarPdf
                    href={`/dashboard/cotizaciones/historial/${cotizacion.id}/pdf`}
                    nombreArchivo={`cotizacion-${cotizacion.codigo}.pdf`}
                    compacto
                  />
                  <Link href={`/dashboard/cotizaciones/historial/${cotizacion.id}`} style={estiloBotonSecundario}>
                    Ver detalle
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const estiloBotonSecundario = {
  border: "1px solid #176B87",
  borderRadius: 8,
  color: "#176B87",
  padding: "9px 14px",
  textDecoration: "none",
  fontWeight: 700,
};
