import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { aprobarCotizacion, cancelarCotizacion } from "../almacen/acciones";
import { formatearFechaHora } from "@/lib/fechas";

export default async function AprobacionPreciosPage() {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const cotizaciones = await prisma.cotizacion.findMany({
    where: {
      estado: "REVISION_ALMACEN",
    },
    include: {
      cliente: true,
      items: {
        include: {
          producto: true,
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
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Aprobación de precios</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Cotizaciones pendientes de revisión y aprobación de precio.
      </p>

      {cotizaciones.length === 0 ? (
        <p style={{ color: "#475569" }}>No hay cotizaciones pendientes de aprobación.</p>
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
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>Cliente: {cotizacion.cliente.nombre}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>Estado: REVISION_ALMACEN</p>
                  <p style={{ margin: "6px 0 0", color: "#475569" }}>{formatearFechaHora(cotizacion.fechaCreacion)}</p>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {cotizacion.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      padding: "8px 0",
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{item.producto.codigo}</p>
                      <p style={{ margin: "4px 0 0", color: "#475569" }}>{item.producto.descripcionOriginal}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, color: "#475569" }}>Cantidad: {item.cantidad}</p>
                      <p style={{ margin: "4px 0 0", fontWeight: 700 }}>{formatearCop(Number(item.subtotal))}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 18, color: "#176B87" }}>
                  Total: {formatearCop(Number(cotizacion.total ?? 0))}
                </strong>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <form action={aprobarCotizacion}>
                    <input type="hidden" name="cotizacionId" value={cotizacion.id} />
                    <button
                      type="submit"
                      style={{
                        border: "none",
                        borderRadius: 8,
                        background: "#087443",
                        color: "#fff",
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Aprobar cotización
                    </button>
                  </form>

                  <form action={cancelarCotizacion}>
                    <input type="hidden" name="cotizacionId" value={cotizacion.id} />
                    <button
                      type="submit"
                      style={{
                        border: "none",
                        borderRadius: 8,
                        background: "#b42318",
                        color: "#fff",
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancelar cotización
                    </button>
                  </form>
                </div>
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

