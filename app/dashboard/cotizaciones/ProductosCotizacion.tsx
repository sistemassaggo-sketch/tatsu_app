"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { useDispatch, useSelector } from "react-redux";
import { agregarProducto, type RootState } from "@/store/cotizacion";

type ColorProducto = { id: number; nombre: string; hex: string };
type ApliqueProducto = { id: number; nombre: string; hex: string; familias: string[] };

const ETIQUETA_FAMILIA: Record<string, string> = {
  ESPEJO: "Espejo",
  MATE: "Mate",
  TRANSLUCIDA: "Translúcida",
};

// Un <option> nativo solo admite texto (no se le puede aplicar un gradiente), así que la familia se
// marca con un ícono junto al nombre; el efecto visual completo (brillo/transparencia) se ve en el
// círculo de vista previa una vez elegido el aplique.
const ICONO_FAMILIA: Record<string, string> = {
  ESPEJO: "✨ ",
  TRANSLUCIDA: "◐ ",
};

// Estilo del círculo de vista previa según la familia del aplique: MATE (o sin familia) se ve como un
// color plano normal, ESPEJO simula un reflejo de luz (brillante) y TRANSLÚCIDA se ve semitransparente.
function estiloSwatchAplique(aplique: ApliqueProducto): CSSProperties {
  const base: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "1px solid #cbd5e1",
    display: "inline-block",
  };

  if (aplique.familias.includes("ESPEJO")) {
    return {
      ...base,
      background: `radial-gradient(circle at 32% 28%, #ffffff 0%, ${aplique.hex} 45%, ${aplique.hex} 100%)`,
      boxShadow: "inset 0 0 2px rgba(255,255,255,0.9), 0 1px 2px rgba(15,23,42,0.35)",
    };
  }

  if (aplique.familias.includes("TRANSLUCIDA")) {
    return {
      ...base,
      background: `linear-gradient(135deg, ${aplique.hex}cc 0%, ${aplique.hex}33 100%)`,
      opacity: 0.85,
    };
  }

  return { ...base, background: aplique.hex };
}

// Organiza los apliques de un producto por familia (un aplique con varias familias aparece en cada
// una); los que no tienen ninguna familia asignada quedan en un grupo aparte al final.
function agruparApliquesPorFamilia(apliques: ApliqueProducto[]) {
  const grupos = new Map<string, ApliqueProducto[]>();
  const sinFamilia: ApliqueProducto[] = [];

  for (const aplique of apliques) {
    if (aplique.familias.length === 0) {
      sinFamilia.push(aplique);
      continue;
    }

    for (const familia of aplique.familias) {
      const lista = grupos.get(familia) ?? [];
      lista.push(aplique);
      grupos.set(familia, lista);
    }
  }

  const gruposOrdenados = Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (sinFamilia.length > 0) {
    gruposOrdenados.push(["Otros", sinFamilia]);
  }

  return gruposOrdenados;
}

type Producto = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioBaseCop: number | null;
  urlId?: string | null;
  casaFamilia?: string | null;
  tipoAcabado?: string | null;
  colores?: ColorProducto[];
  apliques?: ApliqueProducto[];
};



export default function ProductosCotizacion({ productos }: { productos: Producto[] }) {
  const dispatch = useDispatch();
  const items = useSelector((state: RootState) => state.cotizacion.items);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [productoHoverId, setProductoHoverId] = useState<number | null>(null);
  // Color elegido por producto mientras se decide qué agregar (solo aplica a productos con colores).
  const [colorElegidoPorProducto, setColorElegidoPorProducto] = useState<Record<number, number>>({});
  // El aplique es opcional ("aplique si es necesario"), a diferencia del color: se puede deseleccionar.
  const [apliqueElegidoPorProducto, setApliqueElegidoPorProducto] = useState<Record<number, number>>({});

  function agregarAlCarrito(producto: Producto, color?: ColorProducto, aplique?: ApliqueProducto) {
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
        apliqueId: aplique?.id,
        apliqueNombre: aplique?.nombre,
        apliqueHex: aplique?.hex,
      }),
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 12 }}>
        {productos.map((producto) => {
          const tieneColores = (producto.colores?.length ?? 0) > 0;
          const tieneApliques = (producto.apliques?.length ?? 0) > 0;
          const colorIdElegido = colorElegidoPorProducto[producto.id];
          const apliqueIdElegido = apliqueElegidoPorProducto[producto.id];
          const yaAgregado = items.some(
            (item) =>
              item.id === producto.id &&
              (tieneColores ? item.colorId === colorIdElegido : item.colorId == null) &&
              (item.apliqueId ?? undefined) === apliqueIdElegido,
          );

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
                  <p style={{ fontWeight: 800, color: "#176B87" }}>
                    {formatearCop(producto.precioBaseCop ?? 0)}
                  </p>
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

              {tieneApliques ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", fontWeight: 600 }}>
                    Aplique:
                    <select
                      value={apliqueIdElegido ?? ""}
                      onChange={(evento) => {
                        const valor = evento.target.value;
                        setApliqueElegidoPorProducto((estado) => {
                          if (!valor) {
                            const siguiente = { ...estado };
                            delete siguiente[producto.id];
                            return siguiente;
                          }

                          return { ...estado, [producto.id]: Number(valor) };
                        });
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        padding: "6px 8px",
                        font: "inherit",
                        fontWeight: 400,
                      }}
                    >
                      <option value="">Ninguno</option>
                      {agruparApliquesPorFamilia(producto.apliques!).map(([familia, apliquesFamilia]) => (
                        <optgroup key={familia} label={ETIQUETA_FAMILIA[familia] ?? familia}>
                          {apliquesFamilia.map((aplique) => (
                            <option key={aplique.id} value={aplique.id}>
                              {ICONO_FAMILIA[familia] ?? ""}
                              {aplique.nombre}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  {apliqueIdElegido != null ? (() => {
                    const apliqueElegido = producto.apliques!.find((a) => a.id === apliqueIdElegido);

                    return apliqueElegido ? (
                      <span aria-hidden="true" title={apliqueElegido.nombre} style={estiloSwatchAplique(apliqueElegido)} />
                    ) : null;
                  })() : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  const color = tieneColores ? producto.colores!.find((c) => c.id === colorIdElegido) : undefined;

                  if (tieneColores && !color) {
                    return;
                  }

                  const aplique = tieneApliques ? producto.apliques!.find((a) => a.id === apliqueIdElegido) : undefined;

                  agregarAlCarrito(producto, color, aplique);
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
