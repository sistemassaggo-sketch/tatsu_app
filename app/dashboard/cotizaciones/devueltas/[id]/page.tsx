import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { palabrasBusqueda } from "@/lib/busqueda";
import EditorCotizacionDevuelta from "./EditorCotizacionDevuelta";

const productosPorPagina = 10;

export default async function DetalleCotizacionDevueltaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ busqueda?: string; pagina?: string }>;
}) {
  const sesion = await auth();
  const rolUsuario = sesion?.user?.role ?? "";

  // Admin y comercial son responsables de corregir cualquier cotización devuelta.
  if (!["admin", "comercial"].includes(rolUsuario)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const cotizacionId = Number(id);

  if (!Number.isInteger(cotizacionId)) {
    redirect("/dashboard/cotizaciones/devueltas");
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: true,
      items: {
        include: {
          producto: { select: { codigo: true, descripcionOriginal: true } },
          color: { select: { nombre: true, hex: true } },
          aplique: { select: { nombre: true, hex: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cotizacion || cotizacion.estado !== "DEVUELTO_DESDE_ALMACEN") {
    redirect("/dashboard/cotizaciones/devueltas");
  }

  const parametros = await searchParams;
  const busqueda = parametros.busqueda?.trim() ?? "";
  const paginaSolicitada = Number(parametros.pagina ?? "1");
  const paginaActual = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;

  const palabras = palabrasBusqueda(busqueda);
  const condicionesBusqueda = palabras.map((palabra) => ({
    OR: [
      { codigo: { contains: palabra, mode: "insensitive" as const } },
      { descripcionOriginal: { contains: palabra, mode: "insensitive" as const } },
    ],
  }));

  const filtroProductos = condicionesBusqueda.length > 0 ? { AND: condicionesBusqueda } : {};

  const [totalProductos, productosBase] = await Promise.all([
    prisma.producto.count({ where: filtroProductos }),
    prisma.producto.findMany({
      where: filtroProductos,
      orderBy: { codigo: "asc" },
      skip: (paginaActual - 1) * productosPorPagina,
      take: productosPorPagina,
      select: {
        id: true,
        codigo: true,
        descripcionOriginal: true,
        precioBaseCop: true,
        urlId: true,
        colores: {
          where: { color: { activo: true } },
          select: { color: { select: { id: true, nombre: true, hex: true } } },
        },
        apliques: {
          where: { aplique: { activo: true } },
          select: { aplique: { select: { id: true, nombre: true, hex: true, familias: true } } },
        },
      },
    }),
  ]);

  const productos = productosBase.map((producto) => ({
    id: producto.id,
    codigo: producto.codigo,
    descripcionOriginal: producto.descripcionOriginal,
    precioBaseCop: producto.precioBaseCop ? Number(producto.precioBaseCop) : null,
    urlId: producto.urlId,
    colores: producto.colores.map((pc) => ({ id: pc.color.id, nombre: pc.color.nombre, hex: pc.color.hex })),
    apliques: producto.apliques.map((pa) => ({ id: pa.aplique.id, nombre: pa.aplique.nombre, hex: pa.aplique.hex, familias: pa.aplique.familias })),
  }));

  const totalPaginas = Math.max(1, Math.ceil(totalProductos / productosPorPagina));
  const paginaValida = Math.min(paginaActual, totalPaginas);

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Corregir cotización devuelta</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Cliente: {cotizacion.cliente.nombre} · Código: {cotizacion.codigo}
      </p>

      <EditorCotizacionDevuelta
        cotizacionId={cotizacion.id}
        itemsIniciales={cotizacion.items.map((item) => ({
          id: item.id,
          productoId: item.productoId,
          colorId: item.colorId,
          apliqueId: item.apliqueId,
          codigo: item.producto.codigo,
          descripcionOriginal: item.producto.descripcionOriginal,
          colorNombre: item.color?.nombre ?? null,
          colorHex: item.color?.hex ?? null,
          apliqueNombre: item.aplique?.nombre ?? null,
          apliqueHex: item.aplique?.hex ?? null,
          precioUnitario: Number(item.precioUnitario),
          cantidad: item.cantidad,
          eliminado: Boolean(item.eliminado),
          eliminadoPor: item.eliminadoPor ?? null,
        }))}
        productos={productos}
        busqueda={busqueda}
        paginaValida={paginaValida}
        totalPaginas={totalPaginas}
        totalProductos={totalProductos}
        productosPorPagina={productosPorPagina}
      />
    </section>
  );
}
