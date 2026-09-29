"use client";

import { useActionState, useState } from "react";
import { crearProducto } from "./acciones";

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 10px",
  font: "inherit",
};

export default function CrearProducto() {
  const [estado, accion, enviando] = useActionState(crearProducto, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  const [abierto, setAbierto] = useState(false);

  // Al crear bien un producto, se cierra el formulario; se ajusta durante el render (no en un
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
        <strong style={{ fontSize: 14 }}>Productos</strong>

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
          {abierto ? "Cancelar" : "+ Nuevo producto"}
        </button>
      </div>

      {abierto ? (
        <form action={accion} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Código
              <input name="codigo" type="text" placeholder="Ej. ABC123" required style={estiloCampo} />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Precio (COP)
              <input
                name="precioBaseCop"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(evento) => {
                  evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
                }}
                style={estiloCampo}
              />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Existencias
              <input
                name="existencias"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={0}
                onChange={(evento) => {
                  evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
                }}
                style={estiloCampo}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
            Descripción original
            <textarea name="descripcionOriginal" required rows={2} style={{ ...estiloCampo, resize: "vertical" }} />
          </label>

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Casa/familia
              <input name="casaFamilia" type="text" placeholder="Ej. Yamaha" style={estiloCampo} />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Línea
              <input name="linea" type="text" placeholder="Ej. FZ" style={estiloCampo} />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Cilindraje
              <input
                name="cilindraje"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(evento) => {
                  evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
                }}
                style={estiloCampo}
              />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Versión
              <input name="version" type="text" placeholder="Ej. 2.0" style={estiloCampo} />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Tipo de acabado
              <input name="tipoAcabado" type="text" placeholder="Ej. Cromado" style={estiloCampo} />
            </label>

            <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
              Línea original
              <input name="lineaOriginal" type="text" style={estiloCampo} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
            Detalles
            <textarea name="detalles" rows={2} style={{ ...estiloCampo, resize: "vertical" }} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            <input name="mostrarCliente" type="checkbox" value="true" defaultChecked style={{ width: 18, height: 18 }} />
            Mostrar este producto al rol cliente en cotizaciones
          </label>

          <button
            type="submit"
            disabled={enviando}
            style={{
              justifySelf: "start",
              border: "none",
              borderRadius: 8,
              background: "#EF6C21",
              color: "#fff",
              padding: "9px 14px",
              fontWeight: 700,
              cursor: enviando ? "wait" : "pointer",
            }}
          >
            {enviando ? "Creando..." : "Crear producto"}
          </button>
        </form>
      ) : null}

      {estado?.mensaje ? <p style={{ margin: 0, fontSize: 13, color: estado.ok ? "#087443" : "#b42318" }}>{estado.mensaje}</p> : null}
    </div>
  );
}
