import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AlmacenPage() {
  const session = await auth();

  if (!session?.user?.role || !["admin", "almacen"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      estado: "CREADO",
    },
    include: {
      cliente: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
    orderBy: {
      fechaCreacion: "desc",
    },
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
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Almacén</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Cotizaciones pendientes por revisión de almacén.
      </p>

      {cotizaciones.length === 0 ? (
        <p style={{ color: "#475569" }}>No hay cotizaciones en estado creado.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {cotizaciones.map((cotizacion) => (
            <article
              key={cotizacion.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 18,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: "#176B87" }}>{cotizacion.codigo}</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>
                    Cliente: {cotizacion.cliente.nombre}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>Estado: CREADO</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>
                    {formatearFechaLocal(cotizacion.fechaCreacion)}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 18, color: "#176B87" }}>
                  Total: {formatearCop(Number(cotizacion.total ?? 0))}
                </strong>
                <Link
                  href={`/dashboard/almacen/${cotizacion.id}`}
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
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearFechaLocal(fecha: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(fecha));
}
