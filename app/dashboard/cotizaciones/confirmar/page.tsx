"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
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
  const router = useRouter();
  const dispatch = useDispatch();
  const { items: itemsRedux, cliente: clienteRedux, descuentoActivo, descuentoPorcentaje } = useSelector(
    (state: RootState) => state.cotizacion,
  );
  const estadoPersistido = leerEstadoPersistido();
  const items = itemsRedux.length > 0 ? itemsRedux : estadoPersistido.items;
  const cliente = clienteRedux ?? estadoPersistido.cliente;
  const [mostrarDescuento, setMostrarDescuento] = useState(Boolean(descuentoActivo || estadoPersistido.descuentoActivo));
  const [cantidadesEditadas, setCantidadesEditadas] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [toast, setToast] = useState<{ tipo: "success" | "error" | "warning"; mensaje: string } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const tiempo = toast.tipo === "success" ? 1800 : toast.tipo === "warning" ? 3500 : 3200;
    const temporizador = window.setTimeout(() => {
      setToast(null);
    }, tiempo);

    return () => window.clearTimeout(temporizador);
  }, [toast]);

  const subtotal = items.reduce((total, item) => total + item.precio * item.cantidad, 0);
  const descuento = descuentoActivo ? (subtotal * descuentoPorcentaje) / 100 : 0;
  const total = subtotal - descuento;

  async function guardarCotizacion() {
    if (!cliente || items.length === 0) {
      const mensaje = "Debes seleccionar un cliente y al menos un producto.";
      setError(mensaje);
      setToast({ tipo: "warning", mensaje });
      return;
    }

    if (total < 500000) {
      const mensaje = "La cotización debe tener un total mínimo de $500.000 para poder generarse.";
      setError(mensaje);
      setToast({ tipo: "warning", mensaje });
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

      const mensajeExito = `Cotización guardada correctamente: ${datos.codigo ?? "COTIZACIÓN"}`;
      setExito(mensajeExito);
      setToast({ tipo: "success", mensaje: mensajeExito });
      dispatch(limpiarCarrito());
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("cotizacion_estado");
      }

      window.setTimeout(() => {
        router.push("/dashboard/cotizaciones");
      }, 1000);
    } catch (errorActual) {
      const mensajeError = errorActual instanceof Error ? errorActual.message : "No fue posible guardar la cotización.";
      setError(mensajeError);
      setToast({ tipo: "error", mensaje: mensajeError });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {toast ? (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 1500,
            maxWidth: 360,
            width: "calc(100vw - 32px)",
            padding: "14px 16px",
            borderRadius: 12,
            background: toast.tipo === "success" ? "#087443" : toast.tipo === "warning" ? "#D97706" : "#B42318",
            color: "#fff",
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
            fontWeight: 700,
            letterSpacing: "0.01em",
          }}
        >
          {toast.mensaje}
        </div>
      ) : null}

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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={cantidadesEditadas[item.id] ?? String(item.cantidad)}
                    onChange={(event) => {
                      const valorTexto = event.target.value;

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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={descuentoPorcentaje > 0 ? String(descuentoPorcentaje) : ""}
                  onChange={(event) => {
                    const valorTexto = event.target.value;

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
              {guardando ? "Generando..." : "Generar cotización"}
            </button>
          </div>
        </div>
      )}
      </section>
    </>
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
