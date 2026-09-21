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
  type RootState,
} from "@/store/cotizacion";

export default function CarritoCotizacion() {
  const dispatch = useDispatch();
  const { items, cliente, descuentoActivo, descuentoPorcentaje } = useSelector((state: RootState) => state.cotizacion);
  const [mostrarDescuento, setMostrarDescuento] = useState(descuentoActivo);
  const [cantidadesEditadas, setCantidadesEditadas] = useState<Record<number, string>>({});

  useEffect(() => {
    setCantidadesEditadas(
      Object.fromEntries(items.map((item) => [item.id, String(item.cantidad)])),
    );
  }, [items]);

  const subtotal = items.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const descuento = descuentoActivo ? (subtotal * descuentoPorcentaje) / 100 : 0;
  const total = subtotal - descuento;

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
          <article key={item.id} style={estiloProductoFila}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 62, height: 62, borderRadius: 12, background: "#eef6fb", overflow: "hidden", display: "grid", placeItems: "center", position: "relative" }}>
                {item.imagen ? <Image src={item.imagen} alt={item.codigo} fill sizes="62px" style={{ objectFit: "cover" }} /> : <span>📦</span>}
              </div>
              <div>
                <p style={{ fontWeight: 800 }}>{item.codigo}</p>
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
                  value={cantidadesEditadas[item.id] ?? String(item.cantidad)}
                  onChange={(evento) => {
                    const valorTexto = evento.target.value;

                    if (valorTexto === "") {
                      setCantidadesEditadas((estado) => ({ ...estado, [item.id]: "" }));
                      return;
                    }

                    if (!/^[1-9]\d*$/.test(valorTexto)) {
                      return;
                    }

                    const valor = Number(valorTexto);
                    setCantidadesEditadas((estado) => ({ ...estado, [item.id]: String(valor) }));
                    dispatch(actualizarCantidad({ id: item.id, cantidad: valor }));
                  }}
                  style={{ width: 80, ...estiloCampo }}
                />
              </label>

              <div style={{ textAlign: "right" }}>
                <p style={{ fontWeight: 800, color: "#176B87" }}>{formatearCop(item.precio * item.cantidad)}</p>
                <button type="button" onClick={() => dispatch(eliminarProducto(item.id))} style={estiloBotonEliminar}>
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
              style={{
                ...estiloBotonSecundario,
                background: mostrarDescuento ? "#176B87" : "#fff",
                color: mostrarDescuento ? "#fff" : "#176B87",
              }}
            >
              {mostrarDescuento ? "Desactivar" : "Activar"}
            </button>
          </div>

          {mostrarDescuento ? (
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

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Subtotal</span>
              <strong>{formatearCop(subtotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Descuento</span>
              <strong>- {formatearCop(descuento)}</strong>
            </div>
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
