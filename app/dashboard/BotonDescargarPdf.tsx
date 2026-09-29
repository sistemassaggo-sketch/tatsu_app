"use client";

import { useState } from "react";

type Aviso = { tipo: "cargando" | "ok" | "error"; mensaje: string } | null;

const colores = { cargando: "#176B87", ok: "#15803d", error: "#b91c1c" } as const;

export default function BotonDescargarPdf({
  href,
  nombreArchivo,
  compacto = false,
}: {
  href: string;
  nombreArchivo: string;
  compacto?: boolean;
}) {
  const [aviso, setAviso] = useState<Aviso>(null);
  const generando = aviso?.tipo === "cargando";

  async function descargar() {
    if (generando) {
      return;
    }

    setAviso({ tipo: "cargando", mensaje: "Generando PDF, por favor espera..." });

    try {
      const respuesta = await fetch(href, { cache: "no-store" });

      if (!respuesta.ok) {
        throw new Error(await respuesta.text());
      }

      const url = URL.createObjectURL(await respuesta.blob());
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);

      setAviso({ tipo: "ok", mensaje: "PDF descargado correctamente." });
      setTimeout(() => setAviso(null), 3000);
    } catch {
      setAviso({ tipo: "error", mensaje: "No se pudo generar el PDF. Inténtalo de nuevo." });
      setTimeout(() => setAviso(null), 5000);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={descargar}
        disabled={generando}
        style={{
          border: "none",
          borderRadius: 8,
          background: "#EF6C21",
          color: "#fff",
          padding: compacto ? "10px 14px" : "12px 16px",
          font: "inherit",
          fontWeight: 700,
          cursor: generando ? "wait" : "pointer",
          opacity: generando ? 0.7 : 1,
        }}
      >
        {generando ? "Generando..." : "Descargar PDF"}
      </button>

      {aviso ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: "calc(100vw - 40px)",
            borderRadius: 10,
            background: colores[aviso.tipo],
            color: "#fff",
            padding: "12px 16px",
            fontWeight: 600,
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.25)",
          }}
        >
          {aviso.tipo === "cargando" ? (
            <span
              aria-hidden="true"
              style={{
                width: 16,
                height: 16,
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "giroToast 0.8s linear infinite",
              }}
            />
          ) : null}
          {aviso.mensaje}
          <style>{"@keyframes giroToast { to { transform: rotate(360deg); } }"}</style>
        </div>
      ) : null}
    </>
  );
}
