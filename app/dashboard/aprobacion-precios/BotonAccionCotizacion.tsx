"use client";

import { useActionState } from "react";
import type { EstadoAccionAlmacen } from "../almacen/acciones";

type Aviso = { tipo: "cargando" | "ok" | "error"; mensaje: string } | null;

const colores = { cargando: "#176B87", ok: "#15803d", error: "#b91c1c" } as const;

export default function BotonAccionCotizacion({
  cotizacionId,
  etiqueta,
  color,
  accion,
}: {
  cotizacionId: number;
  etiqueta: string;
  color: string;
  accion: (estadoPrevio: EstadoAccionAlmacen, formData: FormData) => Promise<EstadoAccionAlmacen>;
}) {
  const [estado, accionFormulario, enviando] = useActionState(accion, null);

  const aviso: Aviso = enviando
    ? { tipo: "cargando", mensaje: `${etiqueta}...` }
    : estado
      ? { tipo: estado.ok ? "ok" : "error", mensaje: estado.mensaje }
      : null;

  return (
    <>
      <form action={accionFormulario}>
        <input type="hidden" name="cotizacionId" value={cotizacionId} />
        <button
          type="submit"
          disabled={enviando}
          style={{
            border: "none",
            borderRadius: 8,
            background: color,
            color: "#fff",
            padding: "10px 14px",
            fontWeight: 700,
            cursor: enviando ? "wait" : "pointer",
            opacity: enviando ? 0.7 : 1,
          }}
        >
          {etiqueta}
        </button>
      </form>

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
                animation: "giroToastAprobacion 0.8s linear infinite",
              }}
            />
          ) : null}
          {aviso.mensaje}
          <style>{"@keyframes giroToastAprobacion { to { transform: rotate(360deg); } }"}</style>
        </div>
      ) : null}
    </>
  );
}
