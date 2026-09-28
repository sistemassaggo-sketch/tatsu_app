"use client";

import { useActionState, useState } from "react";
import { actualizarApliqueGeneral, alternarApliqueActivo, actualizarFamiliasAplique } from "./acciones";

type Aplique = { id: number; nombre: string; hex: string; activo: boolean; familias: string[] };

const FAMILIAS_APLIQUE = ["ESPEJO", "MATE", "TRANSLUCIDA"] as const;

const estiloCampo = {
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  font: "inherit",
};

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

function FormularioFamilias({ aplique }: { aplique: Aplique }) {
  const [estado, accion, enviando] = useActionState(actualizarFamiliasAplique, null);

  return (
    <form action={accion} style={{ display: "grid", gap: 6 }}>
      <input type="hidden" name="apliqueId" value={aplique.id} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {FAMILIAS_APLIQUE.map((familia) => (
          <label key={familia} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#334155" }}>
            <input type="checkbox" name="familia" value={familia} defaultChecked={aplique.familias.includes(familia)} />
            {familia}
          </label>
        ))}
      </div>
      <div>
        <button type="submit" disabled={enviando} style={estiloBoton}>
          {enviando ? "Guardando..." : "Guardar familias"}
        </button>
      </div>
      {estado?.mensaje ? <p style={{ margin: 0, fontSize: 12, color: estado.ok ? "#087443" : "#b42318" }}>{estado.mensaje}</p> : null}
    </form>
  );
}

export default function FilaApliqueCatalogo({ aplique }: { aplique: Aplique }) {
  const [editando, setEditando] = useState(false);
  const [desplegado, setDesplegado] = useState(false);
  const [estado, accion, enviando] = useActionState(actualizarApliqueGeneral, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  const [, accionAlternar, alternando] = useActionState(alternarApliqueActivo, null);

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
        opacity: aplique.activo ? 1 : 0.5,
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
          style={{ width: 16, height: 16, borderRadius: "50%", background: aplique.hex, border: "1px solid #cbd5e1", flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, textDecoration: aplique.activo ? "none" : "line-through", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {aplique.nombre}
        </span>
        <span aria-hidden="true" style={{ marginLeft: "auto", color: "#94a3b8", transform: desplegado ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>

      {desplegado ? (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: 10, display: "grid", gap: 8 }}>
          {editando ? (
            <form action={accion} style={{ display: "grid", gap: 8 }}>
              <input type="hidden" name="apliqueId" value={aplique.id} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input name="hex" type="color" defaultValue={aplique.hex} style={{ width: 40, height: 32, padding: 2, flexShrink: 0 }} />
                <input name="nombre" type="text" defaultValue={aplique.nombre} required style={{ ...estiloCampo, flex: "1 1 120px" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" disabled={enviando} style={{ ...estiloBoton, background: "#EA5C25", color: "#fff", borderStyle: "none" }}>
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
              <form
                action={accionAlternar}
                onSubmit={(evento) => {
                  if (aplique.activo && !window.confirm(`¿Inhabilitar el aplique "${aplique.nombre}"? Dejará de poder elegirse en cotizaciones.`)) {
                    evento.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="apliqueId" value={aplique.id} />
                <input type="hidden" name="activo" value={String(!aplique.activo)} />
                <button
                  type="submit"
                  disabled={alternando}
                  style={aplique.activo ? { ...estiloBoton, borderColor: "#b42318", color: "#b42318" } : estiloBoton}
                >
                  {aplique.activo ? "Inhabilitar" : "Habilitar"}
                </button>
              </form>
            </div>
          )}

          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Familias</span>
            <FormularioFamilias aplique={aplique} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
