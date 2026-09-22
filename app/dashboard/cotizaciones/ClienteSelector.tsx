"use client";

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

export default function ClienteSelector({ clientes }: { clientes: Cliente[] }) {
  const dispatch = useDispatch();
  const clienteSeleccionado = useSelector((state: RootState) => state.cotizacion.cliente);

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
