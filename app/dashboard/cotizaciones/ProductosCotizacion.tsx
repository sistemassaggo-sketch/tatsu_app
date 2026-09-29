"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDispatch, useSelector } from "react-redux";
import { agregarProducto, type RootState } from "@/store/cotizacion";

export type ColorProducto = { id: number; nombre: string; hex: string };
export type ApliqueProducto = { id: number; nombre: string; hex: string; familias: string[] };

const ETIQUETA_FAMILIA: Record<string, string> = {
  ESPEJO: "Espejo",
  MATE: "Mate",
  TRANSLUCIDA: "Translúcida",
};

// "Tornasol" no es un solo color, sino un degradado; Aplique.hex solo guarda un "#RRGGBB", así que se
// trata como caso especial por nombre (el hex guardado para ese aplique no se usa acá).
const GRADIENTE_TORNASOL =
  "conic-gradient(from 180deg, #ff0000, #ff9900, #ffee00, #33ff00, #00fff2, #0066ff, #cc00ff, #ff0000)";

function esTornasol(nombre: string) {
  return nombre.trim().toLowerCase() === "tornasol";
}

// Estilo del círculo de vista previa según el aplique: "Tornasol" siempre se ve como degradado
// arcoíris (sin importar su familia); si no, el color base es siempre el hex plano del aplique y la
// familia se aplica encima como un CSS `filter` (no un gradiente): ESPEJO sube brillo/saturación para
// verse brillante, TRANSLÚCIDA baja la opacidad vía filter, MATE desatura y opaca levemente para verse
// sin brillo.
function estiloSwatchAplique(aplique: ApliqueProducto): CSSProperties {
  const base: CSSProperties = {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "1px solid #cbd5e1",
    display: "inline-block",
    background: aplique.hex,
  };

  if (esTornasol(aplique.nombre)) {
    return { ...base, background: GRADIENTE_TORNASOL };
  }

  if (aplique.familias.includes("ESPEJO")) {
    return { ...base, filter: "brightness(1.12) saturate(1.1) drop-shadow(0 0 1px rgba(255,255,255,0.6))" };
  }

  if (aplique.familias.includes("TRANSLUCIDA")) {
    return { ...base, filter: "opacity(80%)" };
  }

  if (aplique.familias.includes("MATE")) {
    return { ...base, filter: "saturate(0.92) brightness(0.98)" };
  }

  return base;
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

// Reemplaza al <select> nativo (que no puede pintar el swatch con filtro dentro de cada opción): un
// botón que despliega un panel agrupado por familia, igual que los optgroups, pero con el círculo de
// color real (con su filtro de familia) en cada fila.
export function SelectorAplique({
  apliques,
  apliqueIdElegido,
  onElegir,
}: {
  apliques: ApliqueProducto[];
  apliqueIdElegido: number | undefined;
  onElegir: (apliqueId: number | undefined) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const apliqueElegido = apliques.find((aplique) => aplique.id === apliqueIdElegido);

  useEffect(() => {
    function alHacerClicAfuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }

    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, []);

  return (
    <div ref={contenedorRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: "#fff",
          padding: "6px 8px",
          font: "inherit",
          fontWeight: 400,
          cursor: "pointer",
          minWidth: 140,
        }}
      >
        {apliqueElegido ? (
          <span aria-hidden="true" style={estiloSwatchAplique(apliqueElegido)} />
        ) : null}
        <span>{apliqueElegido ? apliqueElegido.nombre : "Ninguno"}</span>
        <span aria-hidden="true" style={{ marginLeft: "auto", color: "#94a3b8" }}>▾</span>
      </button>

      {abierto ? (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 20,
            marginTop: 4,
            minWidth: 200,
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onElegir(undefined);
              setAbierto(false);
            }}
            style={estiloOpcionSelectorAplique}
          >
            Ninguno
          </button>

          {agruparApliquesPorFamilia(apliques).map(([familia, apliquesFamilia]) => (
            <div key={familia}>
              <div style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                {ETIQUETA_FAMILIA[familia] ?? familia}
              </div>
              {apliquesFamilia.map((aplique) => (
                <button
                  key={aplique.id}
                  type="button"
                  onClick={() => {
                    onElegir(aplique.id);
                    setAbierto(false);
                  }}
                  style={estiloOpcionSelectorAplique}
                >
                  <span aria-hidden="true" style={estiloSwatchAplique(aplique)} />
                  {aplique.nombre}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const estiloOpcionSelectorAplique: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  border: "none",
  borderBottom: "1px solid #f1f5f9",
  background: "#fff",
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
};

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
                  <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Aplique:</span>
                  <SelectorAplique
                    apliques={producto.apliques!}
                    apliqueIdElegido={apliqueIdElegido}
                    onElegir={(apliqueId) => {
                      setApliqueElegidoPorProducto((estado) => {
                        if (apliqueId == null) {
                          const siguiente = { ...estado };
                          delete siguiente[producto.id];
                          return siguiente;
                        }

                        return { ...estado, [producto.id]: apliqueId };
                      });
                    }}
                  />
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
  background: "#EF6C21",
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
