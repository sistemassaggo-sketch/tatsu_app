"use client";

import type { CSSProperties } from "react";
import { useDispatch, useSelector } from "react-redux";
import { agregarProducto, type RootState } from "@/store/cotizacion";

type Producto = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioBaseCop: number | null;
  urlId?: string | null;
};

export default function ProductosCotizacion({ productos }: { productos: Producto[] }) {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cotizacion.items);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {productos.map((producto) => {
        const yaAgregado = items.some((item) => item.id === producto.id);

        return (
          <article key={producto.id} style={estiloProductoFila}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, background: "#eef6fb", overflow: "hidden", display: "grid", placeItems: "center" }}>
                {producto.urlId ? <img src={producto.urlId} alt={producto.codigo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>📦</span>}
              </div>

              <div style={{ flex: "1 1 220px" }}>
                <p style={{ fontWeight: 800, color: "#0f172a" }}>{producto.codigo}</p>
                <p style={{ color: "#475569", marginTop: 4 }}>{producto.descripcionOriginal}</p>
              </div>

              <div style={{ minWidth: 120, textAlign: "right" }}>
                <p style={{ fontWeight: 800, color: "#176B87" }}>{formatearCop(producto.precioBaseCop ?? 0)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                dispatch(
                  agregarProducto({
                    id: producto.id,
                    codigo: producto.codigo,
                    descripcionGeneral: producto.descripcionOriginal,
                    precio: Number(producto.precioBaseCop ?? 0),
                    imagen: producto.urlId ?? "",
                  }),
                )
              }
              disabled={yaAgregado}
              style={{
                ...estiloBotonNaranja,
                opacity: yaAgregado ? 0.6 : 1,
                cursor: yaAgregado ? "not-allowed" : "pointer",
              }}
            >
              {yaAgregado ? "Agregado" : "Agregar"}
            </button>
          </article>
        );
      })}
    </div>
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
