"use client";

import { useCallback, useState } from "react";

type EstadoConfirmacion = { mensaje: string; resolver: (valor: boolean) => void } | null;

// Reemplaza window.confirm por un popup propio (estilizado, centrado, legible en móvil). Uso:
//   const { confirmar, modal } = useConfirmacion();
//   ...
//   if (await confirmar("¿Seguro?")) { ... }
//   ...
//   return <>{modal}{resto}</>;
export function useConfirmacion() {
  const [estado, setEstado] = useState<EstadoConfirmacion>(null);

  const confirmar = useCallback((mensaje: string) => {
    return new Promise<boolean>((resolver) => {
      setEstado({ mensaje, resolver });
    });
  }, []);

  function responder(valor: boolean) {
    estado?.resolver(valor);
    setEstado(null);
  }

  const modal = estado ? (
    <ConfirmModal mensaje={estado.mensaje} onConfirmar={() => responder(true)} onCancelar={() => responder(false)} />
  ) : null;

  return { confirmar, modal };
}

function ConfirmModal({
  mensaje,
  onConfirmar,
  onCancelar,
}: {
  mensaje: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      role="presentation"
      onClick={onCancelar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 2000,
        padding: 16,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-describedby="mensaje-confirmacion"
        onClick={(evento) => evento.stopPropagation()}
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(15, 23, 42, 0.25)",
          padding: "22px 22px 18px",
          display: "grid",
          gap: 16,
        }}
      >
        <p id="mensaje-confirmacion" style={{ margin: 0, color: "#0f172a", fontSize: 15, lineHeight: 1.6 }}>
          {mensaje}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onCancelar}
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#fff",
              color: "#475569",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
              flex: "1 1 auto",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            autoFocus
            style={{
              border: "none",
              borderRadius: 8,
              background: "#EF6C21",
              color: "#fff",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
              flex: "1 1 auto",
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
