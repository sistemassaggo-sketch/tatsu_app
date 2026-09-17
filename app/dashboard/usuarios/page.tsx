import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cambiarEstadoUsuario } from "./acciones";
import FormularioUsuario from "./FormularioUsuario";
import RestablecerContrasena from "./RestablecerContrasena";
import BotonIrArriba from "../BotonIrArriba";

const usuariosPorPagina = 10;

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; busqueda?: string }>;
}) {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const parametros = await searchParams;
  const busqueda = parametros.busqueda?.trim() ?? "";
  const paginaSolicitada = Number(parametros.pagina ?? "1");
  const paginaInicial = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;
  const filtroUsuarios = busqueda
    ? { username: { contains: busqueda, mode: "insensitive" as const } }
    : undefined;
  const [roles, totalUsuarios, usuarios] = await Promise.all([
    prisma.rol.findMany({
      where: { nombre: { in: ["almacen", "comercial"] } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.usuario.count({ where: filtroUsuarios }),
    prisma.usuario.findMany({
      where: filtroUsuarios,
      select: {
        id: true,
        username: true,
        status: true,
        rol: { select: { nombre: true } },
      },
      orderBy: { username: "asc" },
      skip: (paginaInicial - 1) * usuariosPorPagina,
      take: usuariosPorPagina,
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalUsuarios / usuariosPorPagina));
  const paginaActual = Math.min(paginaInicial, totalPaginas);

  return (
    <>
      <BotonIrArriba />
      <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Usuarios</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Crea usuarios con permisos de almacén o comercial.
      </p>
      <FormularioUsuario roles={roles} />

      <div style={{ marginTop: 36 }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: 14 }}>Usuarios registrados</h3>
        <form action="/dashboard/usuarios" method="get" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, marginBottom: 16 }}>
          <input
            name="busqueda"
            type="search"
            defaultValue={busqueda}
            placeholder="Buscar usuario"
            aria-label="Buscar usuario"
            style={{ ...estiloPaginacion, flex: 1, color: "#111827" }}
          />
          <button type="submit" style={{ ...estiloPaginacion, width: "100%" }}>Buscar</button>
        </form>
        <div style={{ display: "grid", gap: 12 }}>
          {usuarios.map((usuario) => (
            <article
              key={usuario.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div>
                <strong>{usuario.username}</strong>
                <p style={{ color: "#475569", margin: "5px 0 0" }}>
                  Rol: {usuario.rol.nombre} · Estado: {usuario.status ? "Activo" : "Inactivo"}
                </p>
              </div>
              <form action={cambiarEstadoUsuario}>
                <input type="hidden" name="usuarioId" value={usuario.id} />
                <input type="hidden" name="estadoNuevo" value={String(!usuario.status)} />
                <button
                  type="submit"
                  style={{
                    ...estiloPaginacion,
                    borderColor: usuario.status ? "#b42318" : "#087443",
                    background: usuario.status ? "#b42318" : "#087443",
                    color: "#fff",
                  }}
                >
                  {usuario.status ? "Usuario inactivo" : "Usuario activo"}
                </button>
              </form>
              <RestablecerContrasena usuarioId={usuario.id} />
            </article>
          ))}
          {usuarios.length === 0 ? <p style={{ color: "#475569" }}>No hay usuarios registrados.</p> : null}
        </div>
        {totalUsuarios > usuariosPorPagina ? (
          <nav
            aria-label="Paginación de usuarios"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20 }}
          >
            {paginaActual > 1 ? (
              <Link href={`/dashboard/usuarios?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaActual - 1}`} style={estiloPaginacion}>
                Anterior
              </Link>
            ) : <span />}
            <span style={{ color: "#475569" }}>
              Página {paginaActual} de {totalPaginas}
            </span>
            {paginaActual < totalPaginas ? (
              <Link href={`/dashboard/usuarios?busqueda=${encodeURIComponent(busqueda)}&pagina=${paginaActual + 1}`} style={estiloPaginacion}>
                Siguiente
              </Link>
            ) : <span />}
          </nav>
        ) : null}
      </div>
    </section>
    </>
  );
}

const estiloPaginacion = {
  border: "1px solid #176B87",
  borderRadius: 8,
  color: "#176B87",
  padding: "9px 12px",
  textDecoration: "none",
  fontWeight: 700,
};
