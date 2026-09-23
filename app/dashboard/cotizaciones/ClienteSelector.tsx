"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { seleccionarCliente, type RootState } from "@/store/cotizacion";

type Cliente = {
  id: number;
  nombre: string;
};

type ClienteFijo = {
  id: number;
  nombre: string;
} | null;

export default function ClienteSelector({
  clientes,
  clienteFijo = null,
}: {
  clientes: Cliente[];
  clienteFijo?: ClienteFijo;
}) {
  const dispatch = useDispatch();
  const clienteSeleccionado = useSelector((state: RootState) => state.cotizacion.cliente);

  // El rol "cliente" no elige cliente: se fija automáticamente al suyo propio y no se muestra el selector.
  useEffect(() => {
    if (clienteFijo && clienteSeleccionado?.id !== clienteFijo.id) {
      dispatch(seleccionarCliente(clienteFijo));
    }
  }, [clienteFijo, clienteSeleccionado, dispatch]);

  if (clienteFijo) {
    return (
      <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>
        Cliente
        <p
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "11px 12px",
            font: "inherit",
            fontWeight: 400,
            background: "#f1f5f9",
            color: "#334155",
            margin: 0,
          }}
        >
          {clienteFijo.nombre}
        </p>
      </label>
    );
  }

  return (
    <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>
      Cliente
      <select
        value={clienteSeleccionado?.id ?? ""}
        onChange={(evento) => {
          const valor = Number(evento.target.value);
          const cliente = clientes.find((item) => item.id === valor) ?? null;
          dispatch(seleccionarCliente(cliente));
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "11px 12px",
          font: "inherit",
        }}
      >
        <option value="">Selecciona un cliente</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
