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

// Identifica una línea del carrito: dos líneas del mismo producto en colores/apliques distintos son
// líneas independientes, así que la clave debe incluir ambos.
function claveItem(item: { id: number; colorId?: number; apliqueId?: number }) {
  return `${item.id}-${item.colorId ?? "sin-color"}-${item.apliqueId ?? "sin-aplique"}`;
}

// Agrupa las líneas del carrito por producto (mismo código): un producto pedido en varios
// colores/apliques se muestra como una sola tarjeta con una sub-línea por combinación, en vez de
// una tarjeta completa repetida por cada color.
function agruparPorProducto<T extends { id: number; codigo: string; descripcionGeneral: string; imagen: string }>(
  items: T[],
) {
  const grupos: { id: number; codigo: string; descripcionGeneral: string; imagen: string; lineas: T[] }[] = [];
  const indicePorId = new Map<number, number>();

  for (const item of items) {
    const indice = indicePorId.get(item.id);

    if (indice !== undefined) {
      grupos[indice].lineas.push(item);
      continue;
    }

    indicePorId.set(item.id, grupos.length);
    grupos.push({ id: item.id, codigo: item.codigo, descripcionGeneral: item.descripcionGeneral, imagen: item.imagen, lineas: [item] });
  }

  return grupos;
}

export default function CarritoCotizacion({ esRolCliente = false }: { esRolCliente?: boolean }) {
  const dispatch = useDispatch();
  const { items, cliente, descuentoActivo, descuentoPorcentaje, esMinorista } = useSelector(
    (state: RootState) => state.cotizacion,
  );
  const [cantidadesEditadas, setCantidadesEditadas] = useState<Record<string, string>>({});
  const [itemsPrevios, setItemsPrevios] = useState(items);

  // Si `items` cambia por fuera (otra línea se agrega/quita/actualiza en Redux), se resincroniza el
  // buffer local durante el render en vez de con un efecto.
  if (items !== itemsPrevios) {
    setItemsPrevios(items);
    setCantidadesEditadas(Object.fromEntries(items.map((item) => [claveItem(item), String(item.cantidad)])));
  }

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
        {agruparPorProducto(items).map((grupo) => (
          <article key={grupo.id} style={estiloTarjetaProducto}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 62, height: 62, borderRadius: 12, background: "#eef6fb", overflow: "hidden", display: "grid", placeItems: "center", position: "relative", flexShrink: 0 }}>
                {grupo.imagen ? <Image src={grupo.imagen} alt={grupo.codigo} fill sizes="62px" style={{ objectFit: "cover" }} /> : <span>📦</span>}
              </div>
              <div style={{ minWidth: 0, flex: "1 1 180px" }}>
                <p style={{ fontWeight: 800, overflowWrap: "anywhere" }}>{grupo.codigo}</p>
                <p style={{ color: "#475569", overflowWrap: "anywhere" }}>{grupo.descripcionGeneral}</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {grupo.lineas.map((item) => (
                <div key={claveItem(item)} className="linea-item" style={estiloSubLinea}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
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
                    {item.apliqueNombre ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                        <span
                          aria-hidden="true"
                          title={item.apliqueNombre}
                          style={{ width: 14, height: 14, borderRadius: "50%", background: item.apliqueHex ?? "#cbd5e1", border: "1px solid #cbd5e1", display: "inline-block" }}
                        />
                        Aplique: {item.apliqueNombre}
                      </span>
                    ) : null}
                    {!item.colorNombre && !item.apliqueNombre ? (
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>Estándar</span>
                    ) : null}
                  </div>

                  <label style={{ display: "grid", gap: 4, fontWeight: 700, fontSize: 13 }}>
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
                        dispatch(actualizarCantidad({ id: item.id, colorId: item.colorId, apliqueId: item.apliqueId, cantidad: valor }));
                      }}
                      className="input-cantidad"
                      style={{ ...estiloCampo }}
                    />
                  </label>

                  <div className="precio-item">
                    <p style={{ color: "#475569", fontSize: 12 }}>{formatearCop(item.precio)} c/u</p>
                    <p style={{ fontWeight: 800, color: "#176B87" }}>{formatearCop(item.precio * item.cantidad)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => dispatch(eliminarProducto({ id: item.id, colorId: item.colorId, apliqueId: item.apliqueId }))}
                    style={estiloBotonEliminar}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
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

      <style jsx>{`
        .precio-item {
          text-align: right;
        }
        .input-cantidad {
          width: 70px;
        }
        @container (max-width: 560px) {
          .linea-item {
            grid-template-columns: 1fr !important;
          }
          .input-cantidad {
            width: 100%;
            max-width: 140px;
          }
          .precio-item {
            text-align: left;
          }
        }
      `}</style>
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

const estiloTarjetaProducto: CSSProperties = {
  display: "grid",
  gap: 14,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
  // Container query en vez de @media: el sidebar del dashboard (260px, en flujo hasta 768px de
  // ancho de ventana) hace que el ancho REAL disponible para esta tarjeta no se pueda predecir solo
  // a partir del ancho de la ventana (por eso el botón "Eliminar" se salía en tablets como Surface
  // Pro aunque el viewport fuera más ancho que el breakpoint). Con container-type, el breakpoint de
  // abajo reacciona al ancho real de la tarjeta, sin importar cuánto sidebar/padding lo haya reducido.
  containerType: "inline-size",
} as CSSProperties;

// Grid con columnas fijas (no flex) para que la cantidad y el precio unitario queden siempre en la
// misma posición horizontal entre filas, sin importar cuánto varíe el largo de los demás textos.
const estiloSubLinea: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(130px, 1fr) 100px 150px 90px",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderTop: "1px solid #f1f5f9",
};
