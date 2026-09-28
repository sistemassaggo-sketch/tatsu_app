"use client";

import { useActionState, useState } from "react";
import { actualizarProductoInventario } from "./acciones";
import BuscadorComponente from "./BuscadorComponente";
import BuscadorColor from "./BuscadorColor";
import BuscadorAplique from "./BuscadorAplique";

type Producto = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioBaseCop: number | null;
  existencias: number;
  disponibilidad: boolean;
};


type Componente = Producto & { cantidadRequerida: number };

type ColorProducto = { id: number; nombre: string; hex: string };
type ApliqueProducto = { id: number; nombre: string; hex: string };

type ProductoConComponentes = {
  productoPadre: Producto;
  componentes: Componente[];
  colores: ColorProducto[];
  apliques: ApliqueProducto[];
};

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 10px",
  font: "inherit",
};

const estiloContenedorComponentes = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  border: "1px dashed #cbd5e1",
  borderRadius: 10,
  padding: 12,
  background: "#f8fafc",
};

const estiloFilaComponente = {
  display: "flex",
  gap: 12,
  alignItems: "flex-end",
  flexWrap: "wrap" as const,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 10,
  background: "#fff",
};

const estiloFilaComponenteNuevo = {
  ...estiloFilaComponente,
  borderStyle: "dashed" as const,
};

const estiloBotonEliminarComponente = {
  border: "1px solid #b42318",
  borderRadius: 8,
  background: "#fff",
  color: "#b42318",
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const estiloBotonDeshacer = {
  border: "1px solid #176B87",
  borderRadius: 8,
  background: "#fff",
  color: "#176B87",
  padding: "8px 12px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const estiloBotonAgregarComponente = {
  border: "1px dashed #176B87",
  borderRadius: 8,
  background: "#fff",
  color: "#176B87",
  padding: "9px 12px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  alignSelf: "flex-start" as const,
};

const formatearCop = (valor: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);

let contadorFilaNueva = 0;
let contadorFilaColorNueva = 0;
let contadorFilaApliqueNueva = 0;

export default function FilaProductoInventario({ producto }: { producto: ProductoConComponentes }) {
  const [editando, setEditando] = useState(false);
  const [estado, accion, enviando] = useActionState(actualizarProductoInventario, null);
  const [estadoAtendido, setEstadoAtendido] = useState(estado);
  const [componentesAEliminar, setComponentesAEliminar] = useState<Set<number>>(new Set());
  const [filasNuevoComponente, setFilasNuevoComponente] = useState<{ clave: number }[]>([]);
  const [coloresAEliminar, setColoresAEliminar] = useState<Set<number>>(new Set());
  const [filasNuevoColor, setFilasNuevoColor] = useState<{ clave: number }[]>([]);
  const [apliquesAEliminar, setApliquesAEliminar] = useState<Set<number>>(new Set());
  const [filasNuevoAplique, setFilasNuevoAplique] = useState<{ clave: number }[]>([]);

  // Al guardar bien, se cierra el formulario; se ajusta durante el render (no en un efecto) para no
  // provocar una vuelta extra de renderizado.
  if (estado !== estadoAtendido) {
    setEstadoAtendido(estado);

    if (estado?.ok) {
      setEditando(false);
      setComponentesAEliminar(new Set());
      setFilasNuevoComponente([]);
      setColoresAEliminar(new Set());
      setFilasNuevoColor([]);
      setApliquesAEliminar(new Set());
      setFilasNuevoAplique([]);
    }
  }

  function alternarEliminarComponente(id: number) {
    setComponentesAEliminar((actual) => {
      const siguiente = new Set(actual);

      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }

      return siguiente;
    });
  }

  function alternarEliminarColor(id: number) {
    setColoresAEliminar((actual) => {
      const siguiente = new Set(actual);

      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }

      return siguiente;
    });
  }

  function alternarEliminarAplique(id: number) {
    setApliquesAEliminar((actual) => {
      const siguiente = new Set(actual);

      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }

      return siguiente;
    });
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

          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label style={{ display: "grid", gap: 5, fontWeight: 600, fontSize: 14 }}>
              Precio (COP)
              <input
                name="precioBaseCop"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={producto.productoPadre.precioBaseCop ?? ""}
                onChange={(evento) => {
                  evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
                }}
                style={estiloCampo}
              />
            </label>

          </div>

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

          <div style={estiloContenedorComponentes}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Componentes</div>

            {producto.componentes.length === 0 && filasNuevoComponente.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>Este producto no tiene componentes.</p>
            ) : null}

            {producto.componentes.map((comp) => {
              const marcadoParaEliminar = componentesAEliminar.has(comp.id);

              return (
                <div
                  key={comp.id}
                  style={{
                    ...estiloFilaComponente,
                    opacity: marcadoParaEliminar ? 0.5 : 1,
                  }}
                >
                  <input type="hidden" name={`eliminar-componente-${comp.id}`} value={String(marcadoParaEliminar)} />

                  <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "#176B87", textDecoration: marcadoParaEliminar ? "line-through" : "none" }}>
                      {comp.codigo}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#475569", textDecoration: marcadoParaEliminar ? "line-through" : "none" }}>
                      {comp.descripcionOriginal}
                    </p>
                  </div>

                  <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
                    Cantidad requerida
                    <input
                      name={`cantidad-componente-${comp.id}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      defaultValue={comp.cantidadRequerida}
                      disabled={marcadoParaEliminar}
                      onChange={(evento) => {
                        evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
                      }}
                      style={{ ...estiloCampo, width: 90 }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => alternarEliminarComponente(comp.id)}
                    style={marcadoParaEliminar ? estiloBotonDeshacer : estiloBotonEliminarComponente}
                  >
                    {marcadoParaEliminar ? "Deshacer" : "Eliminar"}
                  </button>
                </div>
              );
            })}

            {filasNuevoComponente.map((fila, indice) => (
              <div key={fila.clave} style={estiloFilaComponenteNuevo}>
                <BuscadorComponente nombreCampoProductoId={`nuevoComponenteProductoId-${indice}`} />

                <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
                  Cantidad requerida
                  <input
                    name={`nuevoComponenteCantidad-${indice}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    defaultValue={1}
                    onChange={(evento) => {
                      evento.target.value = evento.target.value.replace(/[^0-9]/g, "");
                    }}
                    style={{ ...estiloCampo, width: 90 }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setFilasNuevoComponente((actual) => actual.filter((elemento) => elemento.clave !== fila.clave))
                  }
                  style={estiloBotonEliminarComponente}
                >
                  Quitar
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setFilasNuevoComponente((actual) => [...actual, { clave: contadorFilaNueva++ }])}
              style={estiloBotonAgregarComponente}
            >
              + Agregar componente
            </button>
          </div>

          <div style={estiloContenedorComponentes}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Colores disponibles</div>

            {producto.colores.length === 0 && filasNuevoColor.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>Este producto no tiene colores configurados.</p>
            ) : null}

            {producto.colores.map((color) => {
              const marcadoParaEliminar = coloresAEliminar.has(color.id);

              return (
                <div
                  key={color.id}
                  style={{
                    ...estiloFilaComponente,
                    opacity: marcadoParaEliminar ? 0.5 : 1,
                  }}
                >
                  <input type="hidden" name={`eliminar-color-${color.id}`} value={String(marcadoParaEliminar)} />

                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "1 1 180px" }}>
                    <span
                      aria-hidden="true"
                      style={{ width: 20, height: 20, borderRadius: "50%", background: color.hex, border: "1px solid #cbd5e1", flexShrink: 0 }}
                    />
                    <p style={{ margin: 0, fontWeight: 700, color: "#176B87", textDecoration: marcadoParaEliminar ? "line-through" : "none" }}>
                      {color.nombre}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => alternarEliminarColor(color.id)}
                    style={marcadoParaEliminar ? estiloBotonDeshacer : estiloBotonEliminarComponente}
                  >
                    {marcadoParaEliminar ? "Deshacer" : "Eliminar"}
                  </button>
                </div>
              );
            })}

            {filasNuevoColor.map((fila, indice) => (
              <div key={fila.clave} style={estiloFilaComponenteNuevo}>
                <BuscadorColor nombreCampoColorId={`nuevoColorId-${indice}`} />

                <button
                  type="button"
                  onClick={() => setFilasNuevoColor((actual) => actual.filter((elemento) => elemento.clave !== fila.clave))}
                  style={estiloBotonEliminarComponente}
                >
                  Quitar
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setFilasNuevoColor((actual) => [...actual, { clave: contadorFilaColorNueva++ }])}
              style={estiloBotonAgregarComponente}
            >
              + Agregar color
            </button>
          </div>

          <div style={estiloContenedorComponentes}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Apliques disponibles</div>

            {producto.apliques.length === 0 && filasNuevoAplique.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>Este producto no tiene apliques configurados.</p>
            ) : null}

            {producto.apliques.map((aplique) => {
              const marcadoParaEliminar = apliquesAEliminar.has(aplique.id);

              return (
                <div
                  key={aplique.id}
                  style={{
                    ...estiloFilaComponente,
                    opacity: marcadoParaEliminar ? 0.5 : 1,
                  }}
                >
                  <input type="hidden" name={`eliminar-aplique-${aplique.id}`} value={String(marcadoParaEliminar)} />

                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: "1 1 180px" }}>
                    <span
                      aria-hidden="true"
                      style={{ width: 20, height: 20, borderRadius: "50%", background: aplique.hex, border: "1px solid #cbd5e1", flexShrink: 0 }}
                    />
                    <p style={{ margin: 0, fontWeight: 700, color: "#176B87", textDecoration: marcadoParaEliminar ? "line-through" : "none" }}>
                      {aplique.nombre}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => alternarEliminarAplique(aplique.id)}
                    style={marcadoParaEliminar ? estiloBotonDeshacer : estiloBotonEliminarComponente}
                  >
                    {marcadoParaEliminar ? "Deshacer" : "Eliminar"}
                  </button>
                </div>
              );
            })}

            {filasNuevoAplique.map((fila, indice) => (
              <div key={fila.clave} style={estiloFilaComponenteNuevo}>
                <BuscadorAplique nombreCampoApliqueId={`nuevoApliqueId-${indice}`} />

                <button
                  type="button"
                  onClick={() => setFilasNuevoAplique((actual) => actual.filter((elemento) => elemento.clave !== fila.clave))}
                  style={estiloBotonEliminarComponente}
                >
                  Quitar
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setFilasNuevoAplique((actual) => [...actual, { clave: contadorFilaApliqueNueva++ }])}
              style={estiloBotonAgregarComponente}
            >
              + Agregar aplique
            </button>
          </div>

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
          {producto.componentes.length > 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
              Componentes: {producto.componentes.map((comp) => `${comp.codigo} (x${comp.cantidadRequerida})`).join(", ")}
            </p>
          ) : null}
          {producto.colores.length > 0 ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {producto.colores.map((color) => (
                <span key={color.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
                  <span
                    aria-hidden="true"
                    title={color.nombre}
                    style={{ width: 16, height: 16, borderRadius: "50%", background: color.hex, border: "1px solid #cbd5e1", display: "inline-block" }}
                  />
                  {color.nombre}
                </span>
              ))}
            </div>
          ) : null}
          {producto.apliques.length > 0 ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {producto.apliques.map((aplique) => (
                <span key={aplique.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
                  <span
                    aria-hidden="true"
                    title={aplique.nombre}
                    style={{ width: 16, height: 16, borderRadius: "50%", background: aplique.hex, border: "1px solid #cbd5e1", display: "inline-block" }}
                  />
                  {aplique.nombre}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
