import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { palabrasBusqueda } from "@/lib/busqueda";
import BuscadorInventario from "./BuscadorInventario";
import FilaProductoInventario from "./FilaProductoInventario";
import ColoresCatalogo from "./ColoresCatalogo";
import CrearProducto from "./CrearProducto";

const productosPorPagina = 10;

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ busqueda?: string; pagina?: string }>;
}) {
  const session = await auth();
  const rolUsuario = session?.user?.role ?? "";

  if (!["admin", "almacen"].includes(rolUsuario)) {
    redirect("/dashboard");
  }

  // El catálogo general de colores (crear/editar/inhabilitar colores) es exclusivo de admin;
  // almacén puede ver y editar productos (incluida la asignación de colores ya existentes) pero no
  // administrar el catálogo.
  const esAdmin = rolUsuario === "admin";

  const parametros = await searchParams;
  const busqueda = parametros.busqueda?.trim() ?? "";
  const paginaSolicitada = Number(parametros.pagina ?? "1");
  const paginaActual = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;

  // Cada palabra de la búsqueda se exige por separado (AND) para que el orden no importe: buscar
  // "150 roja" encuentra lo mismo que "roja 150".
  const palabras = palabrasBusqueda(busqueda);
  const filtro =
    palabras.length > 0
      ? {
          AND: palabras.map((palabra) => ({
            OR: [
              { codigo: { contains: palabra, mode: "insensitive" as const } },
              { descripcionOriginal: { contains: palabra, mode: "insensitive" as const } },
            ],
          })),
        }
      : undefined;

  const [totalProductos, productosBase, coloresDisponibles] = await Promise.all([
    prisma.producto.count({ where: filtro }),
    prisma.producto.findMany({
      where: filtro,
      orderBy: { codigo: "asc" },
      skip: (paginaActual - 1) * productosPorPagina,
      take: productosPorPagina,
      select: {
        id: true,
        codigo: true,
        descripcionOriginal: true,
        precioBaseCop: true,
        existencias: true,
        disponibilidad: true,
        componentesPadre: {
          select: {
            cantidadRequeridaComponente: true,
            productoComponente: {
              select: {
                id: true,
                codigo: true,
                descripcionOriginal: true,
                precioBaseCop: true,
                existencias: true,
                disponibilidad: true,

              }
            }
          }
        },
        colores: {
          select: {
            color: { select: { id: true, nombre: true, hex: true } },
          },
        },
      },
    }),
    // El catálogo de gestión trae todos los colores (también los inhabilitados), para poder
    // reactivarlos; el buscador para asignar un color a un producto (BuscadorColor) solo trae los
    // activos, vía su propia consulta a /api/colores/buscar.
    prisma.color.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, hex: true, activo: true },
    }),
  ]);

  const productos = productosBase.map((producto) => ({
    productoPadre: {
      id: producto.id,
      codigo: producto.codigo,
      descripcionOriginal: producto.descripcionOriginal,
      disponibilidad: producto.disponibilidad,
      existencias: producto.existencias,
      precioBaseCop: producto.precioBaseCop ? Number(producto.precioBaseCop) : null
    },
    componentes: producto.componentesPadre.map((pr) => ({
      id: pr.productoComponente.id,
      codigo: pr.productoComponente.codigo,
      descripcionOriginal: pr.productoComponente.descripcionOriginal,
      disponibilidad: pr.productoComponente.disponibilidad,
      existencias: pr.productoComponente.existencias,
      precioBaseCop: pr.productoComponente.precioBaseCop ? Number(pr.productoComponente.precioBaseCop) : null,
      cantidadRequerida: pr.cantidadRequeridaComponente
    })),
    colores: producto.colores.map((pc) => ({
      id: pc.color.id,
      nombre: pc.color.nombre,
      hex: pc.color.hex,
    })),
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
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Inventario</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Consulta los productos y edita su descripción original y precio.
      </p>

      <div style={{ marginBottom: 20 }}>
        <CrearProducto />
      </div>

      {esAdmin ? (
        <div style={{ marginBottom: 20 }}>
          <ColoresCatalogo colores={coloresDisponibles} />
        </div>
      ) : null}

      <div style={{ marginBottom: 20 }}>
        <BuscadorInventario />
      </div>

      {productos.length === 0 ? (
        <p style={{ color: "#475569" }}>
          {busqueda ? `No hay productos que coincidan con "${busqueda}".` : "No hay productos registrados."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {productos.map((producto) => (
            <FilaProductoInventario key={producto.productoPadre.id} producto={producto} />
          ))}
        </div>
      )}

      {totalProductos > productosPorPagina ? (
        <nav
          aria-label="Paginación de inventario"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20 }}
        >
          {paginaValida > 1 ? (
            <Link href={`/dashboard/inventario?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaValida - 1}`} style={estiloBoton}>
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span style={{ color: "#475569" }}>
            Página {paginaValida} de {totalPaginas}
          </span>
          {paginaValida < totalPaginas ? (
            <Link href={`/dashboard/inventario?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaValida + 1}`} style={estiloBoton}>
              Siguiente
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </section>
  );
}

const estiloBoton = {
  border: "1px solid #176B87",
  borderRadius: 8,
  color: "#176B87",
  padding: "9px 14px",
  textDecoration: "none",
  fontWeight: 700,
};
