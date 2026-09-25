"use client";

import { useActionState, useState } from "react";
import { actualizarColorGeneral, alternarColorActivo } from "./acciones";

type Color = { id: number; nombre: string; hex: string; activo: boolean };

const estiloCampo = {
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  font: "inherit",
};

const estiloBoton = {
  border: "1px solid #176B87",
  borderRadius: 8,
  background: "#fff",
  color: "#176B87",
  padding: "6px 10px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

export default function FilaColorCatalogo({ color }: { color: Color }) {
  const [editando, setEditando] = useState(false);
  const [estado, accion, enviando] = useActionState(actualizarColorGeneral, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  const [, accionAlternar, alternando] = useActionState(alternarColorActivo, null);

  if (estado !== estadoAtendido) {
    setEstadoAtendido(estado);

    if (estado?.ok) {
      setEditando(false);
    }
  }

  if (editando) {
    return (
      <form
        action={accion}
        style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", border: "1px dashed #cbd5e1", borderRadius: 8, padding: 8, background: "#fff" }}
      >
        <input type="hidden" name="colorId" value={color.id} />
        <input name="hex" type="color" defaultValue={color.hex} style={{ width: 40, height: 32, padding: 2 }} />
        <input name="nombre" type="text" defaultValue={color.nombre} required style={{ ...estiloCampo, width: 140 }} />
        <button type="submit" disabled={enviando} style={{ ...estiloBoton, background: "#EA5C25", color: "#fff", border: "none" }}>
          {enviando ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" onClick={() => setEditando(false)} style={estiloBoton}>
          Cancelar
        </button>
        {estado?.mensaje ? <p style={{ margin: 0, fontSize: 12, color: estado.ok ? "#087443" : "#b42318", width: "100%" }}>{estado.mensaje}</p> : null}
      </form>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: color.activo ? 1 : 0.5 }}>
      <span
        aria-hidden="true"
        style={{ width: 20, height: 20, borderRadius: "50%", background: color.hex, border: "1px solid #cbd5e1", flexShrink: 0 }}
      />
      <span style={{ fontSize: 13, fontWeight: 600, textDecoration: color.activo ? "none" : "line-through" }}>{color.nombre}</span>
      <button type="button" onClick={() => setEditando(true)} style={estiloBoton}>
        Editar
      </button>
      <form
        action={accionAlternar}
        onSubmit={(evento) => {
          if (color.activo && !window.confirm(`¿Inhabilitar el color "${color.nombre}"? Dejará de poder elegirse en cotizaciones.`)) {
            evento.preventDefault();
          }
        }}
      >
        <input type="hidden" name="colorId" value={color.id} />
        <input type="hidden" name="activo" value={String(!color.activo)} />
        <button
          type="submit"
          disabled={alternando}
          style={color.activo ? { ...estiloBoton, borderColor: "#b42318", color: "#b42318" } : estiloBoton}
        >
          {color.activo ? "Inhabilitar" : "Habilitar"}
        </button>
      </form>
    </div>
  );
}
