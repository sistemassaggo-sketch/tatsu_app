import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cambiarEstadoCliente } from "./acciones";
import EditarCliente from "./EditarCliente";
import FormularioCliente from "./FormularioCliente";

const clientesPorPagina = 10;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; busqueda?: string }>;
}) {
  const session = await auth();

  if (session?.user?.role !== "admin" || session.user.status !== true) {
    redirect("/dashboard");
  }

  const parametros = await searchParams;
  const busqueda = parametros.busqueda?.trim() ?? "";
  const paginaSolicitada = Number(parametros.pagina ?? "1");
  const paginaInicial = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;
  const filtroClientes = busqueda
    ? { nombre: { contains: busqueda, mode: "insensitive" as const } }
    : undefined;
  const totalClientes = await prisma.cliente.count({ where: filtroClientes });
  const totalPaginas = Math.max(1, Math.ceil(totalClientes / clientesPorPagina));
  const paginaActual = Math.min(paginaInicial, totalPaginas);
  const clientes = await prisma.cliente.findMany({
    where: filtroClientes,
    orderBy: { nombre: "asc" },
    skip: (paginaActual - 1) * clientesPorPagina,
    take: clientesPorPagina,
  });

  return (
    <section style={estiloSeccion}>
      <h2 style={estiloTitulo}>Clientes</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Crea, busca y administra los clientes registrados.
      </p>
      <FormularioCliente />

      <div style={{ marginTop: 36 }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: 14 }}>Clientes registrados</h3>
        <form action="/dashboard/clientes" method="get" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input name="busqueda" type="search" defaultValue={busqueda} placeholder="Buscar por nombre" aria-label="Buscar cliente" style={estiloBusqueda} />
          <button type="submit" style={estiloBusqueda}>Buscar</button>
        </form>
        <div style={{ display: "grid", gap: 12 }}>
          {clientes.map((cliente) => (
            <article key={cliente.id} style={estiloCliente}>
              <div>
                <strong>{cliente.nombre}</strong>
                <p style={{ color: "#475569", margin: "5px 0 0" }}>
                  Contacto: {cliente.personaContacto} · Teléfono: {cliente.telefono} · {cliente.ciudad}
                </p>
                <p style={{ color: "#475569", margin: "5px 0 0" }}>
                  Dirección: {cliente.direccion} · Estado: {cliente.status ? "Activo" : "Inactivo"}
                </p>
              </div>
              <form action={cambiarEstadoCliente}>
                <input type="hidden" name="clienteId" value={cliente.id} />
                <input type="hidden" name="estadoNuevo" value={String(!cliente.status)} />
                <button type="submit" style={{ ...estiloBotonEstado, background: cliente.status ? "#b42318" : "#087443" }}>
                  {cliente.status ? "Cliente inactivo" : "Cliente activo"}
                </button>
              </form>
              <EditarCliente cliente={cliente} />
            </article>
          ))}
          {clientes.length === 0 ? <p style={{ color: "#475569" }}>No hay clientes registrados.</p> : null}
        </div>
        {totalClientes > clientesPorPagina ? (
          <nav aria-label="Paginación de clientes" style={estiloPaginacionContenedor}>
            {paginaActual > 1 ? <Link href={crearUrl(busqueda, paginaActual - 1)} style={estiloBotonPaginacion}>Anterior</Link> : <span />}
            <span style={{ color: "#475569" }}>Página {paginaActual} de {totalPaginas}</span>
            {paginaActual < totalPaginas ? <Link href={crearUrl(busqueda, paginaActual + 1)} style={estiloBotonPaginacion}>Siguiente</Link> : <span />}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

function crearUrl(busqueda: string, pagina: number) {
  return `/dashboard/clientes?busqueda=${encodeURIComponent(busqueda)}&pagina=${pagina}`;
}

const estiloSeccion = { background: "#fff", borderRadius: 16, padding: "clamp(20px, 3vw, 28px)", boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)" };
const estiloTitulo = { fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 };
const estiloBusqueda = { border: "1px solid #176B87", borderRadius: 8, color: "#176B87", padding: "9px 12px", fontWeight: 700 };
const estiloCliente = { border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, display: "grid", gap: 12 };
const estiloBotonEstado = { border: "none", borderRadius: 8, color: "#fff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const estiloPaginacionContenedor = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20 };
const estiloBotonPaginacion = { border: "1px solid #176B87", borderRadius: 8, color: "#176B87", padding: "9px 12px", textDecoration: "none", fontWeight: 700 };