"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";
import { SelectorAplique, type ApliqueProducto, type ColorProducto } from "../../ProductosCotizacion";

type ItemExistente = {
  id: number;
  productoId: number;
  colorId: number | null;
  apliqueId: number | null;
  codigo: string;
  descripcionOriginal: string;
  colorNombre?: string | null;
  colorHex?: string | null;
  apliqueNombre?: string | null;
  apliqueHex?: string | null;
  precioUnitario: number;
  cantidad: number;
  eliminado?: boolean;
  eliminadoPor?: string | null;
};

type ProductoCatalogo = {
  id: number;
  codigo: string;
  descripcionOriginal: string;
  precioBaseCop: number | null;
  urlId: string | null;
  colores: ColorProducto[];
  apliques: ApliqueProducto[];
};

type ItemNuevo = {
  clave: number;
  productoId: number;
  codigo: string;
  descripcionOriginal: string;
  colorId?: number;
  colorNombre?: string;
  colorHex?: string;
  apliqueId?: number;
  apliqueNombre?: string;
  apliqueHex?: string;
  cantidad: number;
  precioUnitario: number;
};

const TOTAL_MINIMO = 500000;

function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
}

let contadorItemNuevo = 0;

export default function EditorCotizacionDevuelta({
  cotizacionId,
  itemsIniciales,
  productos,
  busqueda,
  paginaValida,
  totalPaginas,
  totalProductos,
  productosPorPagina,
}: {
  cotizacionId: number;
  itemsIniciales: ItemExistente[];
  productos: ProductoCatalogo[];
  busqueda: string;
  paginaValida: number;
  totalPaginas: number;
  totalProductos: number;
  productosPorPagina: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState(itemsIniciales);
  const [nuevosItems, setNuevosItems] = useState<ItemNuevo[]>([]);
  const [colorElegidoPorProducto, setColorElegidoPorProducto] = useState<Record<number, number>>({});
  const [apliqueElegidoPorProducto, setApliqueElegidoPorProducto] = useState<Record<number, number>>({});
  const [textoBusqueda, setTextoBusqueda] = useState(busqueda);
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  // Buffer de texto por input de cantidad (clave "existente-<id>" / "nuevo-<clave>"): permite borrar
  // el campo para escribir un número nuevo en vez de quedar fijo en el último valor válido.
  const [cantidadesTexto, setCantidadesTexto] = useState<Record<string, string>>({});

  const subtotal = useMemo(() => {
    const subtotalExistentes = items
      .filter((item) => !item.eliminado)
      .reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
    const subtotalNuevos = nuevosItems.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);
    return subtotalExistentes + subtotalNuevos;
  }, [items, nuevosItems]);

  const bajoMinimo = subtotal < TOTAL_MINIMO;

  function alternarEliminado(itemId: number) {
    setItems((actuales) => actuales.map((item) => (item.id === itemId ? { ...item, eliminado: !item.eliminado } : item)));
  }

  function cambiarCantidadExistente(itemId: number, cantidad: number) {
    setItems((actuales) => actuales.map((item) => (item.id === itemId ? { ...item, cantidad: Math.max(1, cantidad) } : item)));
  }

  function quitarNuevo(clave: number) {
    setNuevosItems((actuales) => actuales.filter((item) => item.clave !== clave));
  }

  function cambiarCantidadNuevo(clave: number, cantidad: number) {
    setNuevosItems((actuales) => actuales.map((item) => (item.clave === clave ? { ...item, cantidad: Math.max(1, cantidad) } : item)));
  }

  // Mismo comportamiento que el carrito de compras: un producto ya en la cotización (activo o
  // eliminado) con el mismo color/aplique no se duplica — se reactiva (si estaba eliminado) y su
  // cantidad sube en 1, igual que agregar dos veces el mismo producto al carrito.
  function agregarProducto(producto: ProductoCatalogo, color?: ColorProducto, aplique?: ApliqueProducto) {
    const colorId = color?.id ?? null;
    const apliqueId = aplique?.id ?? null;

    const existenteCoincide = items.some(
      (item) => item.productoId === producto.id && item.colorId === colorId && item.apliqueId === apliqueId,
    );

    if (existenteCoincide) {
      setItems((actuales) =>
        actuales.map((item) =>
          item.productoId === producto.id && item.colorId === colorId && item.apliqueId === apliqueId
            ? { ...item, eliminado: false, cantidad: item.cantidad + 1 }
            : item,
        ),
      );
      return;
    }

    const nuevoCoincide = nuevosItems.some(
      (item) => item.productoId === producto.id && (item.colorId ?? null) === colorId && (item.apliqueId ?? null) === apliqueId,
    );

    if (nuevoCoincide) {
      setNuevosItems((actuales) =>
        actuales.map((item) =>
          item.productoId === producto.id && (item.colorId ?? null) === colorId && (item.apliqueId ?? null) === apliqueId
            ? { ...item, cantidad: item.cantidad + 1 }
            : item,
        ),
      );
      return;
    }

    setNuevosItems((actuales) => [
      ...actuales,
      {
        clave: contadorItemNuevo++,
        productoId: producto.id,
        codigo: producto.codigo,
        descripcionOriginal: producto.descripcionOriginal,
        colorId: color?.id,
        colorNombre: color?.nombre,
        colorHex: color?.hex,
        apliqueId: aplique?.id,
        apliqueNombre: aplique?.nombre,
        apliqueHex: aplique?.hex,
        cantidad: 1,
        precioUnitario: producto.precioBaseCop ?? 0,
      },
    ]);
  }

  function manejarBusqueda(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const parametros = new URLSearchParams();

    if (textoBusqueda.trim()) {
      parametros.set("busqueda", textoBusqueda.trim());
    }

    parametros.set("pagina", "1");
    router.push(`/dashboard/cotizaciones/devueltas/${cotizacionId}?${parametros.toString()}`, { scroll: false });
  }

  async function reenviar() {
    setMensajeError("");

    if (bajoMinimo) {
      setMensajeError("La cotización debe tener un total mínimo de $500.000 para poder reenviarse.");
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch(`/api/cotizaciones/${cotizacionId}/reenviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            ...items.map((item) => ({ itemId: item.id, cantidad: item.cantidad, eliminar: Boolean(item.eliminado) })),
            ...nuevosItems.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              colorId: item.colorId ?? null,
              apliqueId: item.apliqueId ?? null,
            })),
          ],
        }),
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.message || "No fue posible reenviar la cotización.");
      }

      router.push("/dashboard/cotizaciones/devueltas");
      router.refresh();
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "No fue posible reenviar la cotización.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Productos actuales</h3>
        {items.length === 0 ? (
          <p style={{ color: "#475569" }}>Esta cotización no tiene productos.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 14,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                opacity: item.eliminado ? 0.5 : 1,
                background: item.eliminado ? "#f8fafc" : "#fff",
              }}
            >
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#176B87", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {item.codigo}
                  {item.colorNombre ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                      <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: item.colorHex ?? "#cbd5e1", border: "1px solid #cbd5e1", display: "inline-block" }} />
                      {item.colorNombre}
                    </span>
                  ) : null}
                  {item.apliqueNombre ? <span style={{ fontWeight: 600, fontSize: 13, color: "#475569" }}>· Aplique: {item.apliqueNombre}</span> : null}
                </p>
                <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 13 }}>{item.descripcionOriginal}</p>
                {item.eliminado ? (
                  <p style={{ margin: "4px 0 0", color: "#b42318", fontSize: 12, fontWeight: 700 }}>
                    {item.eliminadoPor ? `Eliminado por ${item.eliminadoPor}` : "Eliminado"}
                  </p>
                ) : null}
              </div>

              <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
                Cantidad
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={item.eliminado || enviando}
                  value={cantidadesTexto[`existente-${item.id}`] ?? String(item.cantidad)}
                  onChange={(evento) => {
                    const valorTexto = evento.target.value;

                    if (valorTexto === "") {
                      setCantidadesTexto((estado) => ({ ...estado, [`existente-${item.id}`]: "" }));
                      return;
                    }

                    if (!/^[1-9]\d*$/.test(valorTexto)) {
                      return;
                    }

                    setCantidadesTexto((estado) => ({ ...estado, [`existente-${item.id}`]: valorTexto }));
                    cambiarCantidadExistente(item.id, Number(valorTexto));
                  }}
                  style={{ width: 70, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", font: "inherit" }}
                />
              </label>

              <div style={{ textAlign: "right", minWidth: 100 }}>
                <p style={{ margin: 0, fontWeight: 800, color: "#176B87" }}>{formatearCop(item.precioUnitario * item.cantidad)}</p>
              </div>

              <button
                type="button"
                onClick={() => alternarEliminado(item.id)}
                disabled={enviando}
                style={{
                  border: item.eliminado ? "1px solid #176B87" : "1px solid #b42318",
                  borderRadius: 8,
                  background: "#fff",
                  color: item.eliminado ? "#176B87" : "#b42318",
                  padding: "8px 12px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: enviando ? "not-allowed" : "pointer",
                }}
              >
                {item.eliminado ? "Activar" : "Eliminar"}
              </button>
            </div>
          ))
        )}
      </div>

      {nuevosItems.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Productos agregados</h3>
          {nuevosItems.map((item) => (
            <div key={item.clave} style={{ border: "1px dashed #176B87", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#176B87", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {item.codigo}
                  {item.colorNombre ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, fontSize: 13, color: "#475569" }}>
                      <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: "50%", background: item.colorHex ?? "#cbd5e1", border: "1px solid #cbd5e1", display: "inline-block" }} />
                      {item.colorNombre}
                    </span>
                  ) : null}
                  {item.apliqueNombre ? <span style={{ fontWeight: 600, fontSize: 13, color: "#475569" }}>· Aplique: {item.apliqueNombre}</span> : null}
                </p>
                <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 13 }}>{item.descripcionOriginal}</p>
              </div>

              <label style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600 }}>
                Cantidad
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={enviando}
                  value={cantidadesTexto[`nuevo-${item.clave}`] ?? String(item.cantidad)}
                  onChange={(evento) => {
                    const valorTexto = evento.target.value;

                    if (valorTexto === "") {
                      setCantidadesTexto((estado) => ({ ...estado, [`nuevo-${item.clave}`]: "" }));
                      return;
                    }

                    if (!/^[1-9]\d*$/.test(valorTexto)) {
                      return;
                    }

                    setCantidadesTexto((estado) => ({ ...estado, [`nuevo-${item.clave}`]: valorTexto }));
                    cambiarCantidadNuevo(item.clave, Number(valorTexto));
                  }}
                  style={{ width: 70, boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", font: "inherit" }}
                />
              </label>

              <div style={{ textAlign: "right", minWidth: 100 }}>
                <p style={{ margin: 0, fontWeight: 800, color: "#176B87" }}>{formatearCop(item.precioUnitario * item.cantidad)}</p>
              </div>

              <button
                type="button"
                onClick={() => quitarNuevo(item.clave)}
                disabled={enviando}
                style={{ border: "1px solid #b42318", borderRadius: 8, background: "#fff", color: "#b42318", padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: enviando ? "not-allowed" : "pointer" }}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ color: "#176B87" }}>{formatearCop(subtotal)}</span>
        </div>

        {mensajeError ? <p style={{ margin: 0, color: "#b42318", fontWeight: 700 }}>{mensajeError}</p> : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reenviar}
            disabled={enviando || bajoMinimo}
            style={{
              border: "none",
              borderRadius: 8,
              background: enviando || bajoMinimo ? "#cbd5e1" : "#EF6C21",
              color: enviando || bajoMinimo ? "#475569" : "#fff",
              padding: "12px 16px",
              fontWeight: 700,
              cursor: enviando || bajoMinimo ? "not-allowed" : "pointer",
            }}
          >
            {enviando ? "Reenviando..." : "Reenviar a almacén"}
          </button>
          <Link
            href="/dashboard/cotizaciones/devueltas"
            style={{ border: "1px solid #176B87", borderRadius: 8, color: "#176B87", padding: "11px 16px", textDecoration: "none", fontWeight: 700 }}
          >
            Volver
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Agregar productos</h3>

        <form onSubmit={manejarBusqueda} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="search"
            value={textoBusqueda}
            onChange={(evento) => setTextoBusqueda(evento.target.value)}
            placeholder="Buscar por código o descripción"
            aria-label="Buscar producto"
            style={{ flex: "1 1 260px", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 8, padding: "11px 12px", font: "inherit" }}
          />
          <button
            type="submit"
            style={{ border: "none", borderRadius: 8, background: "#176B87", color: "#fff", padding: "12px 16px", fontWeight: 700, cursor: "pointer" }}
          >
            Buscar
          </button>
        </form>

        {productos.length === 0 ? (
          <p style={{ color: "#475569" }}>No hay productos que coincidan con la búsqueda.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {productos.map((producto) => (
              <TarjetaProductoAgregar
                key={producto.id}
                producto={producto}
                colorIdElegido={colorElegidoPorProducto[producto.id]}
                apliqueIdElegido={apliqueElegidoPorProducto[producto.id]}
                onElegirColor={(colorId) => setColorElegidoPorProducto((estado) => ({ ...estado, [producto.id]: colorId }))}
                onElegirAplique={(apliqueId) => {
                  setApliqueElegidoPorProducto((estado) => {
                    if (apliqueId == null) {
                      const siguiente = { ...estado };
                      delete siguiente[producto.id];
                      return siguiente;
                    }
                    return { ...estado, [producto.id]: apliqueId };
                  });
                }}
                onAgregar={agregarProducto}
                deshabilitado={enviando}
              />
            ))}
          </div>
        )}

        {totalProductos > productosPorPagina ? (
          <nav aria-label="Paginación de productos" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            {paginaValida > 1 ? (
              <Link href={`/dashboard/cotizaciones/devueltas/${cotizacionId}?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaValida - 1}`} scroll={false} style={estiloBotonPaginacion}>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span style={{ color: "#475569" }}>
              Página {paginaValida} de {totalPaginas}
            </span>
            {paginaValida < totalPaginas ? (
              <Link href={`/dashboard/cotizaciones/devueltas/${cotizacionId}?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaValida + 1}`} scroll={false} style={estiloBotonPaginacion}>
                Siguiente
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function TarjetaProductoAgregar({
  producto,
  colorIdElegido,
  apliqueIdElegido,
  onElegirColor,
  onElegirAplique,
  onAgregar,
  deshabilitado,
}: {
  producto: ProductoCatalogo;
  colorIdElegido: number | undefined;
  apliqueIdElegido: number | undefined;
  onElegirColor: (colorId: number) => void;
  onElegirAplique: (apliqueId: number | undefined) => void;
  onAgregar: (producto: ProductoCatalogo, color?: ColorProducto, aplique?: ApliqueProducto) => void;
  deshabilitado?: boolean;
}) {
  const tieneColores = producto.colores.length > 0;
  const tieneApliques = producto.apliques.length > 0;

  return (
    <article style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: "#eef6fb", overflow: "hidden", display: "grid", placeItems: "center", position: "relative", flexShrink: 0 }}>
          {producto.urlId ? <Image src={producto.urlId} alt={producto.codigo} fill sizes="56px" style={{ objectFit: "cover" }} /> : <span>📦</span>}
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <p style={{ fontWeight: 800, color: "#0f172a", margin: 0 }}>{producto.codigo}</p>
          <p style={{ color: "#475569", margin: "4px 0 0" }}>{producto.descripcionOriginal}</p>
        </div>
        <p style={{ fontWeight: 800, color: "#176B87", margin: 0 }}>{formatearCop(producto.precioBaseCop ?? 0)}</p>
      </div>

      {tieneColores ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Color:</span>
          {producto.colores.map((color) => (
            <button
              key={color.id}
              type="button"
              title={color.nombre}
              onClick={() => onElegirColor(color.id)}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: color.hex,
                border: colorIdElegido === color.id ? "3px solid #176B87" : "2px solid #cbd5e1",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      ) : null}

      {tieneApliques ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Aplique:</span>
          <SelectorAplique apliques={producto.apliques} apliqueIdElegido={apliqueIdElegido} onElegir={onElegirAplique} />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          const color = tieneColores ? producto.colores.find((c) => c.id === colorIdElegido) : undefined;
          if (tieneColores && !color) return;
          const aplique = tieneApliques ? producto.apliques.find((a) => a.id === apliqueIdElegido) : undefined;
          onAgregar(producto, color, aplique);
        }}
        disabled={deshabilitado || (tieneColores && colorIdElegido == null)}
        style={{
          border: "none",
          borderRadius: 8,
          background: "#EF6C21",
          color: "#fff",
          padding: "10px 14px",
          fontWeight: 700,
          cursor: deshabilitado || (tieneColores && colorIdElegido == null) ? "not-allowed" : "pointer",
          opacity: deshabilitado || (tieneColores && colorIdElegido == null) ? 0.6 : 1,
        }}
      >
        {tieneColores && colorIdElegido == null ? "Elige un color" : "Agregar"}
      </button>
    </article>
  );
}

const estiloBotonPaginacion: CSSProperties = {
  border: "1px solid #176B87",
  borderRadius: 8,
  color: "#176B87",
  padding: "9px 12px",
  textDecoration: "none",
  fontWeight: 700,
};
