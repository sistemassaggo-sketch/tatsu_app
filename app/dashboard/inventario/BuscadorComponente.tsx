"use client";

import { useEffect, useRef, useState } from "react";

type ProductoEncontrado = { id: number; codigo: string; descripcionOriginal: string };

export default function BuscadorComponente({
  nombreCampoProductoId,
  onSeleccionar,
}: {
  nombreCampoProductoId: string;
  onSeleccionar?: (producto: ProductoEncontrado) => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ProductoEncontrado[]>([]);
  const [seleccionado, setSeleccionado] = useState<ProductoEncontrado | null>(null);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Búsqueda con debounce: espera a que el usuario deje de escribir para no golpear la API en cada tecla.
  useEffect(() => {
    // El JSX ya no muestra el desplegable si no hay texto o ya hay selección, así que no hace
    // falta limpiar `resultados` de forma síncrona acá (evita "setState" directo dentro del efecto).
    if (seleccionado || texto.trim().length === 0) {
      return;
    }

    const temporizador = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const respuesta = await fetch(`/api/productos/buscar?q=${encodeURIComponent(texto)}`);
        const datos = await respuesta.json();
        setResultados(Array.isArray(datos.productos) ? datos.productos : []);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => window.clearTimeout(temporizador);
  }, [texto, seleccionado]);

  // Cierra el desplegable al hacer clic afuera.
  useEffect(() => {
    function alHacerClicAfuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setMostrarResultados(false);
      }
    }

    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, []);

  return (
    <div ref={contenedorRef} style={{ position: "relative", flex: "1 1 220px" }}>
      <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
        Producto (código o nombre)
        <input
          type="text"
          value={seleccionado ? `${seleccionado.codigo} — ${seleccionado.descripcionOriginal}` : texto}
          onChange={(evento) => {
            setSeleccionado(null);
            setTexto(evento.target.value);
            setMostrarResultados(true);
          }}
          onFocus={() => setMostrarResultados(true)}
          placeholder="Ej. ABC123 o filtro de aceite"
          style={estiloCampo}
        />
      </label>

      <input type="hidden" name={nombreCampoProductoId} value={seleccionado?.id ?? ""} />

      {seleccionado ? (
        <button
          type="button"
          onClick={() => {
            setSeleccionado(null);
            setTexto("");
          }}
          style={estiloBotonCambiar}
        >
          Cambiar
        </button>
      ) : null}

      {mostrarResultados && !seleccionado && texto.trim().length > 0 ? (
        <div style={estiloDesplegable}>
          {buscando ? (
            <p style={estiloMensajeDesplegable}>Buscando...</p>
          ) : resultados.length > 0 ? (
            resultados.map((producto) => (
              <button
                key={producto.id}
                type="button"
                onClick={() => {
                  setSeleccionado(producto);
                  setMostrarResultados(false);
                  onSeleccionar?.(producto);
                }}
                style={estiloOpcionDesplegable}
              >
                <strong style={{ color: "#176B87" }}>{producto.codigo}</strong>
                <span style={{ color: "#475569" }}> — {producto.descripcionOriginal}</span>
              </button>
            ))
          ) : (
            <p style={estiloMensajeDesplegable}>Sin resultados.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const estiloCampo = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "9px 10px",
  font: "inherit",
};

const estiloBotonCambiar = {
  marginTop: 4,
  border: "none",
  background: "none",
  color: "#176B87",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

const estiloDesplegable = {
  position: "absolute" as const,
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 20,
  marginTop: 4,
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
  maxHeight: 220,
  overflowY: "auto" as const,
};

const estiloOpcionDesplegable = {
  display: "block",
  width: "100%",
  textAlign: "left" as const,
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  background: "#fff",
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
};

const estiloMensajeDesplegable = {
  margin: 0,
  padding: "10px",
  fontSize: 13,
  color: "#475569",
};
