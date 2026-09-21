import type { CSSProperties } from "react";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClienteSelector from "./ClienteSelector";
import ProductosCotizacion from "./ProductosCotizacion";
import CarritoCotizacion from "./CarritoCotizacion";
import BuscadorProductosCotizacion from "./BuscadorProductosCotizacion";
import BotonIrArriba from "../BotonIrArriba";

const productosPorPagina = 10;

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ busqueda?: string; pagina?: string }>; 
}) {
  const session = await auth();

  if (!["admin", "comercial"].includes(session?.user?.role ?? "")) {
    redirect("/dashboard");
  }

  const parametros = await searchParams;
  const busqueda = parametros.busqueda?.trim() ?? "";
  const paginaSolicitada = Number(parametros.pagina ?? "1");
  const paginaActual = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;

  const [clientes, totalProductos, productosBase] = await Promise.all([
    prisma.cliente.findMany({
      where: { status: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.producto.count({
      where: busqueda
        ? {
            OR: [
              { codigo: { contains: busqueda, mode: "insensitive" } },
              { descripcionOriginal: { contains: busqueda, mode: "insensitive" } },
            ],
          }
        : undefined,
    }),
    prisma.producto.findMany({
      where: busqueda
        ? {
            OR: [
              { codigo: { contains: busqueda, mode: "insensitive" } },
              { descripcionOriginal: { contains: busqueda, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { codigo: "asc" },
      skip: (paginaActual - 1) * productosPorPagina,
      take: productosPorPagina,
      select: {
        id: true,
        codigo: true,
        descripcionOriginal: true,
        precioBaseCop: true,
        urlId: true,
      },
    }),
  ]);

  const productos = productosBase.map((producto) => ({
    ...producto,
    precioBaseCop: producto.precioBaseCop ? Number(producto.precioBaseCop) : null,
  }));

  const totalPaginas = Math.max(1, Math.ceil(totalProductos / productosPorPagina));
  const paginaValida = Math.min(paginaActual, totalPaginas);

  return (
    <>
      <BotonIrArriba />
      <section style={estiloSeccion}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={estiloTitulo}>Cotización</h2>
        <a href="/dashboard/cotizaciones/historial" style={estiloBotonSecundario}>Historial cotizaciones</a>
      </div>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Selecciona un cliente, busca productos por código o descripción general y agrega los que quieras al carrito.
      </p>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <ClienteSelector clientes={clientes} />

          <BuscadorProductosCotizacion />

          <ProductosCotizacion productos={productos} />

          {totalProductos > productosPorPagina ? (
            <nav aria-label="Paginación de productos" style={estiloPaginacion}>
              {paginaValida > 1 ? (
                <a href={`/dashboard/cotizaciones?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaValida - 1}`} style={estiloBotonSecundario}>Anterior</a>
              ) : <span />}
              <span style={{ color: "#475569" }}>Página {paginaValida} de {totalPaginas}</span>
              {paginaValida < totalPaginas ? (
                <a href={`/dashboard/cotizaciones?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaValida + 1}`} style={estiloBotonSecundario}>Siguiente</a>
              ) : <span />}
            </nav>
          ) : null}
        </div>

        <CarritoCotizacion />
      </div>
    </section>
    </>
  );
}

const estiloSeccion: CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: "clamp(20px, 3vw, 28px)",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

const estiloTitulo: CSSProperties = {
  fontSize: "clamp(1.3rem, 2vw, 1.9rem)",
  marginBottom: 8,
};

const estiloCampo: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "11px 12px",
  font: "inherit",
};

const estiloBotonPrimario: CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "#176B87",
  color: "#fff",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const estiloBotonSecundario: CSSProperties = {
  border: "1px solid #176B87",
  borderRadius: 8,
  color: "#176B87",
  padding: "9px 12px",
  textDecoration: "none",
  fontWeight: 700,
};

const estiloPaginacion: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};
