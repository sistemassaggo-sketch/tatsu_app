"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { actualizarCotizacionAlmacen, devolverCotizacionAlmacen } from "./acciones";
import { useConfirmacion } from "../ConfirmModal";

type ItemCotizacionEditor = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  colorNombre?: string | null;
  colorHex?: string | null;
  apliqueNombre?: string | null;
  precioUnitario: number;
  cantidad: number;
  eliminado?: boolean;
  eliminadoPor?: string | null;
  fechaEliminacion?: string | null;
};

export default function DetalleCotizacionEditor({
  cotizacionId,
  itemsIniciales,
  descuentoPorc = 0,
  esMinorista = false,
}: {
  cotizacionId: number;
  itemsIniciales: ItemCotizacionEditor[];
  totalInicial?: number;
  descuentoPorc?: number;
  esMinorista?: boolean;
}) {
  const [estadoAccion, accionFormulario] = useActionState(actualizarCotizacionAlmacen, null);
  const [estadoDevolucion, accionDevolver, devolviendo] = useActionState(devolverCotizacionAlmacen, null);
  const { confirmar, modal } = useConfirmacion();
  const formularioRef = useRef<HTMLFormElement>(null);
  const formularioDevolverRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState(
    itemsIniciales.map((item) => ({
      ...item,
      eliminado: Boolean(item.eliminado),
      eliminadoPor: item.eliminadoPor ?? null,
      fechaEliminacion: item.fechaEliminacion ?? null,
    })),
  );
  const [mensajeError, setMensajeError] = useState("");
  const [cantidadesEditadas, setCantidadesEditadas] = useState<Record<number, string>>({});

  const subtotal = useMemo(
    () =>
      items
        .filter((item) => !item.eliminado)
        .reduce((total, item) => total + Number(item.precioUnitario) * Number(item.cantidad), 0),
    [items],
  );

  const descuento = (subtotal * descuentoPorc) / 100;
  // Minorista y descuento son excluyentes: si es minorista no se toma descuento y el total se duplica.
  const totalActual = esMinorista ? subtotal * 2 : subtotal - descuento;
  const totalMinimo = 500000;
  // El mínimo se valida sobre el total real que va a quedar (antes de descuento, pero ya duplicado
  // si es minorista), igual que en el servidor.
  const bajoMinimo = (esMinorista ? subtotal * 2 : subtotal) < totalMinimo;

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

  const manejarClicGuardar = async () => {
    if (bajoMinimo) {
      setMensajeError("La cotización debe tener un total mínimo de $500.000 para poder guardarse.");
      return;
    }

    setMensajeError("");

    // Si no queda descuento pendiente, guardar legaliza de inmediato y descuenta existencias ya
    // mismo; si queda descuento, las existencias se descontarán después, cuando admin apruebe.
    if (await confirmar("Las existencias de estos productos se descontarán del inventario. ¿Continuar?")) {
      formularioRef.current?.requestSubmit();
    }
  };

  const manejarClicDevolver = async () => {
    if (await confirmar("¿Devolver esta cotización al vendedor/cliente para que la corrija?")) {
      formularioDevolverRef.current?.requestSubmit();
    }
  };

  return (
    <>
    <form ref={formularioRef} action={accionFormulario} style={{ display: "grid", gap: 20 }}>
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
                <p style={{ margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                  {item.codigo}
                  {item.colorNombre ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                      <span
                        aria-hidden="true"
                        style={{ width: 12, height: 12, borderRadius: "50%", background: item.colorHex ?? "#cbd5e1", border: "1px solid #cbd5e1", display: "inline-block" }}
                      />
                      {item.colorNombre}
                    </span>
                  ) : null}
                  {item.apliqueNombre ? (
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#475569" }}>· Aplique: {item.apliqueNombre}</span>
                  ) : null}
                </p>
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  name={`cantidad-${item.id}`}
                  value={cantidadesEditadas[item.id] ?? String(item.cantidad)}
                  disabled={item.eliminado}
                  onChange={(event) => {
                    const valorTexto = event.target.value;

                    if (valorTexto === "") {
                      setCantidadesEditadas((estado) => ({ ...estado, [item.id]: "" }));
                      return;
                    }

                    if (!/^[1-9]\d*$/.test(valorTexto)) {
                      return;
                    }

                    setCantidadesEditadas((estado) => ({ ...estado, [item.id]: valorTexto }));
                    actualizarCantidad(item.id, Number(valorTexto));
                  }}
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
                  background: item.eliminado ? "#176B87" : "#EF6C21",
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
        {esMinorista ? (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Minorista</span>
            <strong>Total x2</strong>
          </div>
        ) : descuentoPorc > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Descuento ({descuentoPorc}%)</span>
            <strong>-{formatearCop(descuento)}</strong>
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ color: "#176B87" }}>{formatearCop(totalActual)}</span>
        </div>
      </div>

      {mensajeError ? <p style={{ margin: 0, color: "#b42318", fontWeight: 700 }}>{mensajeError}</p> : null}
      {estadoAccion && !estadoAccion.ok ? (
        <p style={{ margin: 0, color: "#b42318", fontWeight: 700 }}>{estadoAccion.mensaje}</p>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={manejarClicGuardar}
          disabled={bajoMinimo}
          style={{
            border: "none",
            borderRadius: 8,
            background: bajoMinimo ? "#cbd5e1" : "#EF6C21",
            color: bajoMinimo ? "#475569" : "#fff",
            padding: "12px 16px",
            fontWeight: 700,
            cursor: bajoMinimo ? "not-allowed" : "pointer",
            opacity: bajoMinimo ? 0.8 : 1,
          }}
        >
          Guardar y enviar a revisión
        </button>
        <Link href="/dashboard/almacen" style={{
          border: "1px solid #176B87",
          borderRadius: 8,
          color: "#176B87",
          padding: "11px 16px",
          textDecoration: "none",
          fontWeight: 700,
        }}>
          Volver
        </Link>
      </div>
    </form>

    <form ref={formularioDevolverRef} action={accionDevolver} style={{ marginTop: 16 }}>
      <input type="hidden" name="cotizacionId" value={cotizacionId} />
      <button
        type="button"
        onClick={manejarClicDevolver}
        disabled={devolviendo}
        style={{
          border: "1px solid #b42318",
          borderRadius: 8,
          background: "#fff",
          color: "#b42318",
          padding: "11px 16px",
          fontWeight: 700,
          cursor: devolviendo ? "wait" : "pointer",
        }}
      >
        {devolviendo ? "Devolviendo..." : "Devolver al vendedor/cliente"}
      </button>
      {estadoDevolucion?.mensaje ? (
        <p style={{ margin: "8px 0 0", color: estadoDevolucion.ok ? "#087443" : "#b42318", fontWeight: 700 }}>
          {estadoDevolucion.mensaje}
        </p>
      ) : null}
    </form>

    {modal}
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
