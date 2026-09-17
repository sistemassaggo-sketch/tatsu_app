"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import {
  actualizarCantidad,
  eliminarProducto,
  activarDescuento,
  cambiarDescuento,
  limpiarCarrito,
  leerEstadoPersistido,
  type RootState,
} from "@/store/cotizacion";

export default function ConfirmarCotizacionPage() {
  const dispatch = useDispatch();
  const { items: itemsRedux, cliente: clienteRedux, descuentoActivo, descuentoPorcentaje } = useSelector(
    (state: RootState) => state.cotizacion,
  );
  const estadoPersistido = leerEstadoPersistido();
  const items = itemsRedux.length > 0 ? itemsRedux : estadoPersistido.items;
  const cliente = clienteRedux ?? estadoPersistido.cliente;
  const [mostrarDescuento, setMostrarDescuento] = useState(Boolean(descuentoActivo || estadoPersistido.descuentoActivo));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const subtotal = items.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const descuento = descuentoActivo ? (subtotal * descuentoPorcentaje) / 100 : 0;
  const total = subtotal - descuento;

  async function guardarCotizacion() {
    if (!cliente || items.length === 0) {
      setError("Debes seleccionar un cliente y al menos un producto.");
      return;
    }

    setGuardando(true);
    setError("");
    setExito("");

    try {
      const respuesta = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: cliente.id,
          items,
          descuentoActivo,
          descuentoPorcentaje,
        }),
      });

      const textoRespuesta = await respuesta.text();
      let datos: { message?: string; codigo?: string } = {};

      if (textoRespuesta) {
        try {
          datos = JSON.parse(textoRespuesta);
        } catch {
          datos = { message: "La respuesta del servidor no es válida." };
        }
      }

      if (!respuesta.ok) {
        throw new Error(datos.message || "No fue posible guardar la cotización.");
      }

      setExito(`Cotización guardada correctamente: ${datos.codigo ?? "COTIZACIÓN"}`);
      dispatch(limpiarCarrito());
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cotizacion_estado");
      }
    } catch (errorActual) {
      setError(errorActual instanceof Error ? errorActual.message : "No fue posible guardar la cotización.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section style={estiloSeccion}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h2 style={estiloTitulo}>Confirmar pedido</h2>
          <p style={{ color: "#475569" }}>{cliente ? `Cliente: ${cliente.nombre}` : "Selecciona un cliente antes de confirmar"}</p>
        </div>
        <Link href="/dashboard/cotizaciones" style={estiloBotonSecundario}>
          Volver a productos
        </Link>
      </div>

      {items.length === 0 ? (
        <p style={{ color: "#475569" }}>No hay productos agregados al carrito.</p>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {items.map((item) => (
            <article key={item.id} style={estiloProductoFila}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: "#eef6fb", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.codigo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span>📦</span>
                  )}
                </div>
                <div>
                  <p style={{ fontWeight: 800 }}>{item.codigo}</p>
                  <p style={{ color: "#475569" }}>{item.descripcionGeneral}</p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(event) => dispatch(actualizarCantidad({ id: item.id, cantidad: Number(event.target.value) || 1 }))}
                    style={{ ...estiloCampo, width: 80 }}
                  />
                </label>

                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 800, color: "#176B87" }}>{formatearCop(item.precio * item.cantidad)}</p>
                  <button
                    type="button"
                    onClick={() => dispatch(eliminarProducto(item.id))}
                    style={{ ...estiloBotonEliminar, marginTop: 8 }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}

          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <strong>Descuento</strong>
              <button
                type="button"
                onClick={() => {
                  const activo = !mostrarDescuento;
                  setMostrarDescuento(activo);
                  dispatch(activarDescuento(activo));
                }}
                style={{ ...estiloBotonSecundario, background: mostrarDescuento ? "#176B87" : "#fff", color: mostrarDescuento ? "#fff" : "#176B87" }}
              >
                {mostrarDescuento ? "Desactivar" : "Activar"}
              </button>
            </div>

            {mostrarDescuento ? (
              <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                % descuento
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={descuentoPorcentaje}
                  onChange={(event) => dispatch(cambiarDescuento(Number(event.target.value) || 0))}
                  style={estiloCampo}
                />
              </label>
            ) : null}

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <strong>{formatearCop(subtotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Descuento</span>
                <strong>- {formatearCop(descuento)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: "#176B87" }}>{formatearCop(total)}</span>
              </div>
            </div>

            {error ? <p style={{ color: "#b42318", margin: 0 }}>{error}</p> : null}
            {exito ? <p style={{ color: "#087443", margin: 0 }}>{exito}</p> : null}

            <button
              type="button"
              onClick={guardarCotizacion}
              disabled={guardando}
              style={{
                border: "none",
                borderRadius: 8,
                background: "#EA5C25",
                color: "#fff",
                padding: "12px 16px",
                fontWeight: 700,
                cursor: guardando ? "not-allowed" : "pointer",
                opacity: guardando ? 0.7 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar cotización"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

const estiloSeccion: CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "clamp(20px, 3vw, 28px)",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const estiloTitulo: CSSProperties = {
  fontSize: "clamp(1.3rem, 2vw, 1.9rem)",
  marginBottom: 8,
};

const estiloCampo: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  font: "inherit",
};

const estiloBotonSecundario: CSSProperties = {
  border: "1px solid #176B87",
  borderRadius: 8,
  color: "#176B87",
  padding: "9px 12px",
  textDecoration: "none",
  fontWeight: 700,
  background: "#fff",
  cursor: "pointer",
};

const estiloBotonEliminar: CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "#b42318",
  color: "#fff",
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const estiloProductoFila: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
  flexWrap: "wrap",
};
