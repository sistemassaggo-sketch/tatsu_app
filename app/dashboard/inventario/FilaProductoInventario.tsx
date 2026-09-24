"use client";

import { useActionState, useState } from "react";
import { actualizarProductoInventario } from "./acciones";

type Producto = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioBaseCop: number | null;
  existencias: number;
  disponibilidad: boolean;
};


type Componente = Producto & { cantidadRequerida: number };

type ProductoConComponentes = {
  productoPadre: Producto;
  componentes: Componente[];
};

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 10px",
  font: "inherit",
};

const formatearCop = (valor: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

export default function FilaProductoInventario({ producto }: { producto: ProductoConComponentes }) {
  const [editando, setEditando] = useState(false);
  const [estado, accion, enviando] = useActionState(actualizarProductoInventario, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  { console.log(producto) }

  // Al guardar bien, se cierra el formulario; se ajusta durante el render (no en un efecto) para no
  // provocar una vuelta extra de renderizado.
  if (estado !== estadoAtendido) {
    setEstadoAtendido(estado);

    if (estado?.ok) {
      setEditando(false);
    }
  }

  return (
    <article
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ color: "#176B87" }}>{producto.productoPadre.codigo}</strong>
        {!editando ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            style={{
              border: "1px solid #176B87",
              borderRadius: 8,
              background: "#fff",
              color: "#176B87",
              padding: "6px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Editar
          </button>
        ) : null}
      </div>

      {editando ? (
        <form
          action={accion}
          onSubmit={() => {
            // El formulario permanece abierto hasta que el resultado confirme el guardado.
          }}
          style={{ display: "grid", gap: 10 }}
        >
          <input type="hidden" name="productoId" value={producto.productoPadre.id} />

          <label style={{ display: "grid", gap: 5, fontWeight: 600, fontSize: 14 }}>
            Descripción original
            <textarea
              name="descripcionOriginal"
              defaultValue={producto.productoPadre.descripcionOriginal}
              required
              rows={3}
              style={{ ...estiloCampo, resize: "vertical" }}
            />
          </label>

          <label style={{ display: "grid", gap: 5, fontWeight: 600, fontSize: 14 }}>
            Precio (COP)
            <input
              name="precioBaseCop"
              type="number"
              min={0}
              step="1"
              defaultValue={producto.productoPadre.precioBaseCop ?? ""}
              style={estiloCampo}
            />
          </label>

          <label style={{ display: "grid", gap: 5, fontWeight: 600, fontSize: 14 }}>
            Existencias
            <input
              name="existencias"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              defaultValue={producto.productoPadre.existencias}
              onChange={(evento) => {
                evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
              }}
              style={estiloCampo}
            />
          </label>
          <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
            Si las existencias quedan en más de 0, el producto vuelve a marcarse como disponible automáticamente.
          </p>

          {
            producto.componentes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontWeight: "bold" }}>Componentes</div>

                {producto.componentes.map((comp) => (
                  <div key={comp.id} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: "bolder" }}>Código: {comp.codigo}</p>
                    <p>Cantidad requerida del componente: {comp.cantidadRequerida}</p>
                    <p>Descripción: {comp.descripcionOriginal}</p>
                  </div>
                ))}
              </div>
            )
          }

          {estado?.mensaje ? (
            <p style={{ margin: 0, color: estado.ok ? "#087443" : "#b42318" }}>{estado.mensaje}</p>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={enviando}
              style={{
                border: "none",
                borderRadius: 8,
                background: "#EA5C25",
                color: "#fff",
                padding: "9px 14px",
                fontWeight: 700,
                cursor: enviando ? "wait" : "pointer",
              }}
            >
              {enviando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                background: "#fff",
                color: "#475569",
                padding: "9px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <p style={{ margin: 0, color: "#475569" }}>{producto.productoPadre.descripcionOriginal}</p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <strong style={{ color: "#111827" }}>
              {producto.productoPadre.precioBaseCop != null ? formatearCop(producto.productoPadre.precioBaseCop) : "Sin precio"}
            </strong>
            <span style={{ color: "#475569" }}>Existencias: {producto.productoPadre.existencias}</span>
            <span style={{ color: producto.productoPadre.disponibilidad ? "#087443" : "#b42318", fontWeight: 700 }}>
              {producto.productoPadre.disponibilidad ? "Disponible" : "No disponible"}
            </span>
          </div>
        </>
      )}
    </article>
  );
}
