import type { CSSProperties } from "react";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatearFechaHora } from "@/lib/fechas";

export default async function AuditoriaPage() {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const eventos = await prisma.auditoriaEvento.findMany({
    orderBy: {
      fechaHora: "desc",
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
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Auditoría</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Registro de accesos, cambios y decisiones sobre cotizaciones.
      </p>

      {eventos.length === 0 ? (
        <p style={{ color: "#475569" }}>No hay eventos registrados aún.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#0f172a" }}>
                <th style={estiloCabecera}>Fecha y hora</th>
                <th style={estiloCabecera}>Usuario</th>
                <th style={estiloCabecera}>IP</th>
                <th style={estiloCabecera}>Acción</th>
                <th style={estiloCabecera}>Recurso</th>
                <th style={estiloCabecera}>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => (
                <tr key={evento.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={estiloCelda}>{formatearFechaHora(evento.fechaHora)}</td>
                  <td style={estiloCelda}>{evento.usuario}</td>
                  <td style={estiloCelda}>{evento.ip ?? "Desconocida"}</td>
                  <td style={estiloCelda}>
                    <span
                      style={{
                        display: "inline-block",
                        background: obtenerColorAccion(evento.accion),
                        color: "#fff",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {evento.accion}
                    </span>
                  </td>
                  <td style={estiloCelda}>
                    {evento.recurso}
                    {evento.recursoId ? ` #${evento.recursoId}` : ""}
                  </td>
                  <td style={{ ...estiloCelda, maxWidth: 360, whiteSpace: "normal" }}>{evento.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


function obtenerColorAccion(accion: string) {
  switch (accion) {
    case "INICIO_SESION":
      return "#176B87";
    case "CREAR_COTIZACION":
      return "#EF6C21";
    case "MODIFICAR_COTIZACION":
      return "#D97706";
    case "APROBAR_COTIZACION":
      return "#087443";
    case "RECHAZAR_COTIZACION":
      return "#B42318";
    default:
      return "#475569";
  }
}

const estiloCabecera: CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const estiloCelda: CSSProperties = {
  padding: "12px 10px",
  verticalAlign: "top",
  color: "#334155",
  fontSize: 14,
};
