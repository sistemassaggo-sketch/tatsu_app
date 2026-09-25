"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  actualizarCantidad,
  eliminarProducto,
  activarDescuento,
  cambiarDescuento,
  activarMinorista,
  type RootState,
} from "@/store/cotizacion";

// Identifica una línea del carrito: dos líneas del mismo producto en colores distintos son líneas
// independientes, así que la clave debe incluir el color.
function claveItem(item: { id: number; colorId?: number }) {
  return `${item.id}-${item.colorId ?? "sin-color"}`;
}

export default function CarritoCotizacion({ esRolCliente = false }: { esRolCliente?: boolean }) {
  const dispatch = useDispatch();
  const { items, cliente, descuentoActivo, descuentoPorcentaje, esMinorista } = useSelector(
    (state: RootState) => state.cotizacion,
  );
  const [cantidadesEditadas, setCantidadesEditadas] = useState<Record<string, string>>({});

  useEffect(() => {
    setCantidadesEditadas(
      Object.fromEntries(items.map((item) => [claveItem(item), String(item.cantidad)])),
    );
  }, [items]);

  // El rol "cliente" nunca cotiza como minorista ni con descuento; si quedaron en true por un
  // estado persistido anterior (p. ej. cambio de rol del usuario), se corrigen al montar el carrito.
  useEffect(() => {
    if (esRolCliente && esMinorista) {
      dispatch(activarMinorista(false));
    }

    if (esRolCliente && descuentoActivo) {
      dispatch(activarDescuento(false));
    }
  }, [esRolCliente, esMinorista, descuentoActivo, dispatch]);

  const subtotal = items.reduce((total, item) => total + item.precio * item.cantidad, 0);
  // Minorista y descuento son excluyentes: si es minorista no se toma descuento y el total se duplica.
  const descuento = !esMinorista && descuentoActivo ? (subtotal * descuentoPorcentaje) / 100 : 0;
  const total = esMinorista ? subtotal * 2 : subtotal - descuento;

  if (items.length === 0) {
    return (
      <section style={estiloSeccion}>
        <h3 style={estiloTitulo}>Carrito de cotización</h3>
        <p style={{ color: "#475569" }}>Aún no hay productos agregados.</p>
      </section>
    );
  }

  return (
    <section style={estiloSeccion}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <h3 style={estiloTitulo}>Carrito de cotización</h3>
        <p style={{ color: "#475569" }}>{cliente ? `Cliente: ${cliente.nombre}` : "Sin cliente"}</p>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {items.map((item) => (
          <article key={claveItem(item)} style={estiloProductoFila}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 62, height: 62, borderRadius: 12, background: "#eef6fb", overflow: "hidden", display: "grid", placeItems: "center", position: "relative" }}>
                {item.imagen ? <Image src={item.imagen} alt={item.codigo} fill sizes="62px" style={{ objectFit: "cover" }} /> : <span>📦</span>}
              </div>
              <div>
                <p style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                  {item.codigo}
                  {item.colorNombre ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                      <span
                        aria-hidden="true"
                        title={item.colorNombre}
                        style={{ width: 14, height: 14, borderRadius: "50%", background: item.colorHex ?? "#cbd5e1", border: "1px solid #cbd5e1", display: "inline-block" }}
                      />
                      {item.colorNombre}
                    </span>
                  ) : null}
                </p>
                <p style={{ color: "#475569" }}>{item.descripcionGeneral}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                Cantidad
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={cantidadesEditadas[claveItem(item)] ?? String(item.cantidad)}
                  onChange={(evento) => {
                    const valorTexto = evento.target.value;

                    if (valorTexto === "") {
                      setCantidadesEditadas((estado) => ({ ...estado, [claveItem(item)]: "" }));
                      return;
                    }

                    if (!/^[1-9]\d*$/.test(valorTexto)) {
                      return;
                    }

                    const valor = Number(valorTexto);
                    setCantidadesEditadas((estado) => ({ ...estado, [claveItem(item)]: String(valor) }));
                    dispatch(actualizarCantidad({ id: item.id, colorId: item.colorId, cantidad: valor }));
                  }}
                  style={{ width: 80, ...estiloCampo }}
                />
              </label>

              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#475569", fontSize: 13 }}>Precio unitario: {formatearCop(item.precio)}</p>
                <p style={{ fontWeight: 800, color: "#176B87" }}>Total: {formatearCop(item.precio * item.cantidad)}</p>
                <button
                  type="button"
                  onClick={() => dispatch(eliminarProducto({ id: item.id, colorId: item.colorId }))}
                  style={estiloBotonEliminar}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        ))}

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 14 }}>
          {!esRolCliente ? (
            <label style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={esMinorista}
                onChange={(evento) => dispatch(activarMinorista(evento.target.checked))}
                style={{ width: 18, height: 18 }}
              />
              Cotizar como minorista
            </label>
          ) : null}

          {!esRolCliente && !esMinorista ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong>Descuento</strong>
                <button
                  type="button"
                  onClick={() => dispatch(activarDescuento(!descuentoActivo))}
                  style={{
                    ...estiloBotonSecundario,
                    background: descuentoActivo ? "#176B87" : "#fff",
                    color: descuentoActivo ? "#fff" : "#176B87",
                  }}
                >
                  {descuentoActivo ? "Desactivar" : "Activar"}
                </button>
              </div>

              {descuentoActivo ? (
                <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                  % descuento
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={descuentoPorcentaje > 0 ? String(descuentoPorcentaje) : ""}
                    onChange={(evento) => {
                      const valorTexto = evento.target.value;

                      if (valorTexto === "") {
                        dispatch(cambiarDescuento(0));
                        return;
                      }

                      if (!/^(?:[0-9]|[1-9][0-9]|100)$/.test(valorTexto)) {
                        return;
                      }

                      dispatch(cambiarDescuento(Number(valorTexto)));
                    }}
                    style={estiloCampo}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal</span>
              <strong>{formatearCop(subtotal)}</strong>
            </div>
            {!esRolCliente && !esMinorista ? (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Descuento</span>
                <strong>- {formatearCop(descuento)}</strong>
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: "#176B87" }}>{formatearCop(total)}</span>
            </div>
          </div>

          <Link href="/dashboard/cotizaciones/confirmar" style={estiloBotonPrimario as CSSProperties}>
            Confirmar pedido
          </Link>
        </div>
      </div>
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
  fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
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

const estiloBotonPrimario: CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "#176B87",
  color: "#fff",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
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
