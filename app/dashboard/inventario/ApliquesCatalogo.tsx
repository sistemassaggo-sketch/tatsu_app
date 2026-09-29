"use client";

import { useActionState, useState } from "react";
import { crearApliqueGeneral } from "./acciones";
import FilaApliqueCatalogo from "./FilaApliqueCatalogo";

type Aplique = { id: number; nombre: string; hex: string; activo: boolean; familias: string[] };

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 10px",
  font: "inherit",
};

export default function ApliquesCatalogo({ apliques }: { apliques: Aplique[] }) {
  const [estado, accion, enviando] = useActionState(crearApliqueGeneral, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  const [abierto, setAbierto] = useState(false);

  // Al crear bien un aplique, se cierra el formulario; se ajusta durante el render (no en un
  // efecto) para no provocar una vuelta extra de renderizado.
  if (estado !== estadoAtendido) {
    setEstadoAtendido(estado);

    if (estado?.ok) {
      setAbierto(false);
    }
  }

  return (
    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 12, display: "grid", gap: 10, background: "#f8fafc" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 14 }}>Catálogo de apliques</strong>

        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          style={{
            border: "1px solid #176B87",
            borderRadius: 8,
            background: "#fff",
            color: "#176B87",
            padding: "6px 12px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {abierto ? "Cancelar" : "+ Nuevo aplique"}
        </button>
      </div>

      {apliques.length === 0 ? (
        <span style={{ fontSize: 13, color: "#475569" }}>Aún no hay apliques creados.</span>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
          {apliques.map((aplique) => (
            <FilaApliqueCatalogo key={aplique.id} aplique={aplique} />
          ))}
        </div>
      )}

      {abierto ? (
        <form action={accion} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
            Color
            <input name="hex" type="color" defaultValue="#ff0000" style={{ width: 48, height: 36, padding: 2 }} />
          </label>

          <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600, flex: "1 1 160px" }}>
            Nombre
            <input name="nombre" type="text" placeholder="Ej. Cromado" required style={estiloCampo} />
          </label>

          <button
            type="submit"
            disabled={enviando}
            style={{
              border: "none",
              borderRadius: 8,
              background: "#EF6C21",
              color: "#fff",
              padding: "9px 14px",
              fontWeight: 700,
              cursor: enviando ? "wait" : "pointer",
            }}
          >
            {enviando ? "Creando..." : "Crear aplique"}
          </button>
        </form>
      ) : null}

      {estado?.mensaje ? <p style={{ margin: 0, fontSize: 13, color: estado.ok ? "#087443" : "#b42318" }}>{estado.mensaje}</p> : null}
    </div>
  );
}
