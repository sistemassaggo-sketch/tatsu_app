"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { useDispatch, useSelector } from "react-redux";
import { agregarProducto, type RootState } from "@/store/cotizacion";

type ColorProducto = { id: number; nombre: string; hex: string };

type Producto = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioBaseCop: number | null;
  urlId?: string | null;
  casaFamilia?: string | null;
  tipoAcabado?: string | null;
  colores?: ColorProducto[];
};

export default function ProductosCotizacion({ productos }: { productos: Producto[] }) {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cotizacion.items);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoHoverId, setProductoHoverId] = useState<number | null>(null);
  // Color elegido por producto mientras se decide qué agregar (solo aplica a productos con colores).
  const [colorElegidoPorProducto, setColorElegidoPorProducto] = useState<Record<number, number>>({});

  function agregarAlCarrito(producto: Producto, color?: ColorProducto) {
    dispatch(
      agregarProducto({
        id: producto.id,
        codigo: producto.codigo,
        descripcionGeneral: producto.descripcionOriginal,
        precio: Number(producto.precioBaseCop ?? 0),
        imagen: producto.urlId ?? "",
        colorId: color?.id,
        colorNombre: color?.nombre,
        colorHex: color?.hex,
      }),
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {productos.map((producto) => {
          const tieneColores = (producto.colores?.length ?? 0) > 0;
          const colorIdElegido = colorElegidoPorProducto[producto.id];
          const yaAgregado = tieneColores
            ? items.some((item) => item.id === producto.id && item.colorId === colorIdElegido)
            : items.some((item) => item.id === producto.id && item.colorId == null);

          return (
            <article key={producto.id} style={estiloProductoFila}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button
                  type="button"
                  aria-label={`Ampliar imagen de ${producto.codigo}`}
                  onMouseEnter={() => setProductoHoverId(producto.id)}
                  onMouseLeave={() => setProductoHoverId((actual) => (actual === producto.id ? null : actual))}
                  onFocus={() => setProductoHoverId(producto.id)}
                  onBlur={() => setProductoHoverId((actual) => (actual === producto.id ? null : actual))}
                  onClick={() => setProductoSeleccionado(producto)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    position: "relative",
                  }}
                >
                  <div
                    className="contenedorMiniatura"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      background: "#eef6fb",
                      overflow: "hidden",
                      display: "grid",
                      placeItems: "center",
                      position: "relative",
                    }}
                  >
                    {producto.urlId ? (
                      <Image src={producto.urlId} alt={producto.codigo} fill sizes="72px" style={{ objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>📦</span>
                    )}

                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "auto 8px 8px auto",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "rgba(23, 107, 135, 0.9)",
                        display: "grid",
                        placeItems: "center",
                        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 900,
                        opacity: productoHoverId === producto.id ? 1 : 0,
                        transform: productoHoverId === producto.id ? "scale(1)" : "scale(0.8)",
                        transition: "all 0.2s ease",
                        pointerEvents: "none",
                      }}
                    >
                      ⌕
                    </span>
                  </div>
                </button>

                <div style={{ flex: "1 1 220px" }}>
                  <p style={{ fontWeight: 800, color: "#0f172a" }}>{producto.codigo}</p>
                  <p style={{ color: "#475569", marginTop: 4 }}>{producto.descripcionOriginal}</p>
                </div>

                <div style={{ minWidth: 120, textAlign: "right" }}>
                  <p style={{ fontWeight: 800, color: "#176B87" }}>{formatearCop(producto.precioBaseCop ?? 0)}</p>
                </div>
              </div>

              {tieneColores ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Color:</span>
                  {producto.colores!.map((color) => {
                    const elegido = colorIdElegido === color.id;

                    return (
                      <button
                        key={color.id}
                        type="button"
                        aria-label={color.nombre}
                        title={color.nombre}
                        onClick={() => setColorElegidoPorProducto((estado) => ({ ...estado, [producto.id]: color.id }))}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: color.hex,
                          border: elegido ? "3px solid #176B87" : "2px solid #cbd5e1",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (tieneColores) {
                    const color = producto.colores!.find((c) => c.id === colorIdElegido);

                    if (!color) {
                      return;
                    }

                    agregarAlCarrito(producto, color);
                    return;
                  }

                  agregarAlCarrito(producto);
                }}
                disabled={yaAgregado || (tieneColores && colorIdElegido == null)}
                style={{
                  ...estiloBotonNaranja,
                  opacity: yaAgregado || (tieneColores && colorIdElegido == null) ? 0.6 : 1,
                  cursor: yaAgregado || (tieneColores && colorIdElegido == null) ? "not-allowed" : "pointer",
                }}
              >
                {yaAgregado ? "Agregado" : tieneColores && colorIdElegido == null ? "Elige un color" : "Agregar"}
              </button>
            </article>
          );
        })}
      </div>

      {productoSeleccionado ? (
        <div
          onClick={() => setProductoSeleccionado(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.7)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(90vw, 420px)",
              maxHeight: "75vh",
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.25)",
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.2)",
            }}
          >
            <button
              type="button"
              aria-label="Cerrar vista previa"
              onClick={() => setProductoSeleccionado(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "none",
                background: "rgba(15, 23, 42, 0.7)",
                color: "#fff",
                fontSize: 24,
                cursor: "pointer",
                zIndex: 1,
              }}
            >
              ×
            </button>

            <div style={{ width: "100%", aspectRatio: "4 / 3", background: "#eef6fb", display: "grid", placeItems: "center", position: "relative" }}>
              {productoSeleccionado.urlId ? (
                <Image
                  src={productoSeleccionado.urlId}
                  alt={productoSeleccionado.codigo}
                  fill
                  sizes="(max-width: 700px) 92vw, 640px"
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 52 }}>📦</span>
              )}
            </div>

            <div style={{ padding: "16px 18px 18px" }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "#0f172a" }}>{productoSeleccionado.codigo}</p>
              <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>{productoSeleccionado.descripcionOriginal}</p>
              <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>Familia {productoSeleccionado.casaFamilia}</p>
              <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.6 }}>Tipo de Acabado: {productoSeleccionado.tipoAcabado}</p>
            </div>
          </div>
        </div>
      ) : null}
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

const estiloBotonNaranja: CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "#EA5C25",
  color: "#fff",
  padding: "10px 14px",
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
