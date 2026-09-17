"use client";

import { useMemo, useState } from "react";
import { actualizarCotizacionAlmacen } from "./acciones";

type ItemCotizacionEditor = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioUnitario: number;
  cantidad: number;
  eliminado?: boolean;
  eliminadoPor?: string | null;
  fechaEliminacion?: string | null;
};

export default function DetalleCotizacionEditor({
  cotizacionId,
  itemsIniciales,
  totalInicial,
}: {
  cotizacionId: number;
  itemsIniciales: ItemCotizacionEditor[];
  totalInicial: number;
}) {
  const [items, setItems] = useState(
    itemsIniciales.map((item) => ({
      ...item,
      eliminado: Boolean(item.eliminado),
      eliminadoPor: item.eliminadoPor ?? null,
      fechaEliminacion: item.fechaEliminacion ?? null,
    })),
  );
  const [mensajeError, setMensajeError] = useState("");

  const subtotal = useMemo(
    () =>
      items
        .filter((item) => !item.eliminado)
        .reduce((total, item) => total + Number(item.precioUnitario) * Number(item.cantidad), 0),
    [items],
  );

  const totalActual = subtotal;
  const totalMinimo = 500000;

  const actualizarCantidad = (itemId: number, cantidad: number) => {
    const cantidadValida = Number.isFinite(cantidad) ? Math.max(1, cantidad) : 1;
    setItems((itemsActuales) =>
      itemsActuales.map((item) =>
        item.id === itemId ? { ...item, cantidad: cantidadValida } : item,
      ),
    );
  };

  const manejarEliminacion = (itemId: number) => {
    setItems((itemsActuales) =>
      itemsActuales.map((item) =>
        item.id === itemId ? { ...item, eliminado: !item.eliminado, eliminadoPor: null, fechaEliminacion: null } : item,
      ),
    );
  };

  const manejarSubmit = (evento: React.FormEvent<HTMLFormElement>) => {
    if (totalActual < totalMinimo) {
      evento.preventDefault();
      setMensajeError("La cotización debe tener un total mínimo de $500.000 para poder guardarse.");
    } else {
      setMensajeError("");
    }
  };

  return (
    <form action={actualizarCotizacionAlmacen} onSubmit={manejarSubmit} style={{ display: "grid", gap: 20 }}>
      <input type="hidden" name="cotizacionId" value={cotizacionId} />

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <article
            key={item.id}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
              display: "grid",
              gap: 10,
              opacity: item.eliminado ? 0.6 : 1,
              textDecoration: item.eliminado ? "line-through" : "none",
              background: item.eliminado ? "#f8fafc" : "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800 }}>{item.codigo}</p>
                <p style={{ margin: "6px 0 0", color: "#475569" }}>{item.descripcionOriginal}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, color: "#475569" }}>Precio unitario</p>
                <p style={{ margin: "6px 0 0", fontWeight: 700, color: "#176B87" }}>
                  {formatearCop(Number(item.precioUnitario))}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
              <label style={{ display: "grid", gap: 6, fontWeight: 700, maxWidth: 150, flex: 1 }}>
                Cantidad
                <input
                  type="number"
                  min={1}
                  name={`cantidad-${item.id}`}
                  value={item.cantidad}
                  disabled={item.eliminado}
                  onChange={(event) => actualizarCantidad(item.id, Number(event.target.value || 1))}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "10px 12px",
                    font: "inherit",
                    background: item.eliminado ? "#e2e8f0" : "#fff",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => manejarEliminacion(item.id)}
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: item.eliminado ? "#176B87" : "#EA5C25",
                  color: "#fff",
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {item.eliminado ? "Restaurar" : "Eliminar"}
              </button>
            </div>

            <input type="hidden" name={`eliminado-${item.id}`} value={String(item.eliminado)} />
          </article>
        ))}
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <strong>{formatearCop(subtotal)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ color: "#176B87" }}>{formatearCop(totalActual)}</span>
        </div>
      </div>

      {mensajeError ? <p style={{ margin: 0, color: "#b42318", fontWeight: 700 }}>{mensajeError}</p> : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={totalActual < totalMinimo}
          style={{
            border: "none",
            borderRadius: 8,
            background: totalActual < totalMinimo ? "#cbd5e1" : "#EA5C25",
            color: totalActual < totalMinimo ? "#475569" : "#fff",
            padding: "12px 16px",
            fontWeight: 700,
            cursor: totalActual < totalMinimo ? "not-allowed" : "pointer",
            opacity: totalActual < totalMinimo ? 0.8 : 1,
          }}
        >
          Guardar y enviar a revisión
        </button>
        <a href="/dashboard/almacen" style={{
          border: "1px solid #176B87",
          borderRadius: 8,
          color: "#176B87",
          padding: "11px 16px",
          textDecoration: "none",
          fontWeight: 700,
        }}>
          Volver
        </a>
      </div>
    </form>
  );
}

function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}
