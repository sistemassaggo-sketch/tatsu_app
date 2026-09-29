import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatearFechaHora } from "@/lib/fechas";

function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
}

export default async function CotizacionesDevueltasPage() {
  const sesion = await auth();
  const rolUsuario = sesion?.user?.role ?? "";

  // Admin y comercial son responsables de corregir cualquier cotización devuelta (incluidas las que
  // creó un cliente, cuyo "vendedor" es el propio cliente); el rol "cliente" no las gestiona.
  if (!["admin", "comercial"].includes(rolUsuario)) {
    redirect("/dashboard");
  }

  const cotizaciones = await prisma.cotizacion.findMany({
    where: { estado: "DEVUELTO_DESDE_ALMACEN" },
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
        <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Cotizaciones devueltas</h2>
        <Link
          href="/dashboard/cotizaciones"
          style={{ border: "1px solid #176B87", borderRadius: 8, color: "#176B87", padding: "9px 12px", textDecoration: "none", fontWeight: 700 }}
        >
          Nueva cotización
        </Link>
      </div>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Almacén devolvió estas cotizaciones para que se corrijan antes de reenviarlas a revisión.
      </p>

      {cotizaciones.length === 0 ? (
        <p style={{ color: "#475569" }}>No hay cotizaciones devueltas por almacén.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {cotizaciones.map((cotizacion) => (
            <article key={cotizacion.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: "#176B87" }}>{cotizacion.codigo}</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>Cliente: {cotizacion.cliente.nombre}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, color: "#475569" }}>{formatearFechaHora(cotizacion.fechaCreacion)}</p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 18, color: "#176B87" }}>Total: {formatearCop(Number(cotizacion.total ?? 0))}</strong>
                <Link
                  href={`/dashboard/cotizaciones/devueltas/${cotizacion.id}`}
                  style={{ border: "1px solid #176B87", borderRadius: 8, color: "#176B87", padding: "9px 12px", textDecoration: "none", fontWeight: 700 }}
                >
                  Corregir y reenviar
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
