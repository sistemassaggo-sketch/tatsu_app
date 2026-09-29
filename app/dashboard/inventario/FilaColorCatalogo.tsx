"use client";

import { useActionState, useRef, useState } from "react";
import { actualizarColorGeneral, alternarColorActivo } from "./acciones";
import { useConfirmacion } from "../ConfirmModal";

type Color = { id: number; nombre: string; hex: string; activo: boolean };

const estiloCampo = {
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  font: "inherit",
};

// Separado en borderWidth/borderStyle/borderColor (en vez del shorthand "border") porque el botón
// "Inhabilitar" solo sobreescribe borderColor condicionalmente; mezclar shorthand y longhand para el
// mismo valor hace que React no pueda limpiar la propiedad correctamente al alternar entre estilos.
const estiloBoton = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#176B87",
  borderRadius: 8,
  background: "#fff",
  color: "#176B87",
  padding: "6px 10px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

// Fila colapsada por defecto (igual que los apliques): con muchos colores en el catálogo, mostrar
// siempre el swatch + nombre + dos botones por color ocupaba demasiada pantalla.
export default function FilaColorCatalogo({ color }: { color: Color }) {
  const [editando, setEditando] = useState(false);
  const [desplegado, setDesplegado] = useState(false);
  const [estado, accion, enviando] = useActionState(actualizarColorGeneral, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  const [, accionAlternar, alternando] = useActionState(alternarColorActivo, null);
  const { confirmar, modal } = useConfirmacion();
  const formularioAlternarRef = useRef<HTMLFormElement>(null);

  async function manejarClicAlternar() {
    if (color.activo && !(await confirmar(`¿Inhabilitar el color "${color.nombre}"? Dejará de poder elegirse en cotizaciones.`))) {
      return;
    }

    formularioAlternarRef.current?.requestSubmit();
  }

  if (estado !== estadoAtendido) {
    setEstadoAtendido(estado);

    if (estado?.ok) {
      setEditando(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        background: "#fff",
        opacity: color.activo ? 1 : 0.5,
        minWidth: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setDesplegado((valor) => !valor)}
        aria-expanded={desplegado}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          border: "none",
          background: "none",
          padding: "8px 10px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 16, height: 16, borderRadius: "50%", background: color.hex, border: "1px solid #cbd5e1", flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, textDecoration: color.activo ? "none" : "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {color.nombre}
        </span>
        <span aria-hidden="true" style={{ marginLeft: "auto", color: "#94a3b8", transform: desplegado ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>

      {desplegado ? (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: 10, display: "grid", gap: 8 }}>
          {editando ? (
            <form action={accion} style={{ display: "grid", gap: 8 }}>
              <input type="hidden" name="colorId" value={color.id} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input name="hex" type="color" defaultValue={color.hex} style={{ width: 40, height: 32, padding: 2, flexShrink: 0 }} />
                <input name="nombre" type="text" defaultValue={color.nombre} required style={{ ...estiloCampo, flex: "1 1 120px" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={enviando} style={{ ...estiloBoton, background: "#EF6C21", color: "#fff", borderStyle: "none" }}>
                  {enviando ? "Guardando..." : "Guardar"}
                </button>
                <button type="button" onClick={() => setEditando(false)} style={estiloBoton}>
                  Cancelar
                </button>
              </div>
              {estado?.mensaje ? <p style={{ margin: 0, fontSize: 12, color: estado.ok ? "#087443" : "#b42318" }}>{estado.mensaje}</p> : null}
            </form>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setEditando(true)} style={estiloBoton}>
                Editar
              </button>
              <form ref={formularioAlternarRef} action={accionAlternar}>
                <input type="hidden" name="colorId" value={color.id} />
                <input type="hidden" name="activo" value={String(!color.activo)} />
                <button
                  type="button"
                  onClick={manejarClicAlternar}
                  disabled={alternando}
                  style={color.activo ? { ...estiloBoton, borderColor: "#b42318", color: "#b42318" } : estiloBoton}
                >
                  {color.activo ? "Inhabilitar" : "Habilitar"}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}

      {modal}
    </div>
  );
}
