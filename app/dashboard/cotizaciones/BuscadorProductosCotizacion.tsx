"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function BuscadorProductosCotizacion() {
  const router = useRouter();
  const parametros = useSearchParams();
  const busquedaActual = parametros.get("busqueda") ?? "";
  const [valorBusqueda, setValorBusqueda] = useState(busquedaActual);

  useEffect(() => {
    setValorBusqueda(busquedaActual);
  }, [busquedaActual]);

  const manejarEnvio = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    const parametrosSiguientes = new URLSearchParams(parametros.toString());
    const texto = valorBusqueda.trim();

    if (texto) {
      parametrosSiguientes.set("busqueda", texto);
    } else {
      parametrosSiguientes.delete("busqueda");
    }

    parametrosSiguientes.set("pagina", "1");
    router.push(`/dashboard/cotizaciones?${parametrosSiguientes.toString()}`);
  };

  return (
    <form onSubmit={manejarEnvio} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input
        name="busqueda"
        type="search"
        value={valorBusqueda}
        onChange={(evento) => setValorBusqueda(evento.target.value)}
        placeholder="Buscar por código o descripción general"
        aria-label="Buscar producto"
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          padding: "11px 12px",
          font: "inherit",
          flex: "1 1 260px",
        }}
      />
      <button
        type="submit"
        style={{
          border: "none",
          borderRadius: 8,
          background: "#176B87",
          color: "#fff",
          padding: "12px 16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Buscar
      </button>
    </form>
  );
}
