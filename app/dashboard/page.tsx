import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

const menuItems = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Usuarios", href: "/dashboard/usuarios" },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // El rol "cliente" no tiene módulo de resumen: va directo a cotizar.
  if (session.user.role === "cliente") {
    redirect("/dashboard/cotizaciones");
  }

  let metricas: { titulo: string; valor: number; color: string }[] | null = null;

  if (session.user.role === "admin") {
    const [legalizaciones, cotizaciones, auditoria, clientes, usuarios] = await Promise.all([
      prisma.cotizacion.count({ where: { estado: "LEGALIZADO" } }),
      prisma.cotizacion.count(),
      prisma.auditoriaEvento.count(),
      prisma.cliente.count(),
      prisma.usuario.count({ where: { status: true } }),
    ]);

    metricas = [
      { titulo: "Legalizaciones", valor: legalizaciones, color: "#176B87" },
      { titulo: "Cotizaciones", valor: cotizaciones, color: "#EF6C21" },
      { titulo: "Registros de auditoría", valor: auditoria, color: "#7c3aed" },
      { titulo: "Clientes", valor: clientes, color: "#15803d" },
      { titulo: "Usuarios activos", valor: usuarios, color: "#b45309" },
    ];
  } else if (session.user.role === "almacen") {
    const [revision, legalizaciones] = await Promise.all([
      prisma.cotizacion.count({ where: { estado: "CREADO" } }),
      prisma.cotizacion.count({ where: { estado: "LEGALIZADO" } }),
    ]);

    metricas = [
      { titulo: "Cotizaciones en revisión de almacén", valor: revision, color: "#EF6C21" },
      { titulo: "Legalizaciones", valor: legalizaciones, color: "#176B87" },
    ];
  } else if (session.user.role === "comercial") {
    const [cotizaciones, legalizaciones] = await Promise.all([
      prisma.cotizacion.count(),
      prisma.cotizacion.count({ where: { estado: "LEGALIZADO" } }),
    ]);

    metricas = [
      { titulo: "Cotizaciones", valor: cotizaciones, color: "#EF6C21" },
      { titulo: "Legalizaciones", valor: legalizaciones, color: "#176B87" },
    ];
  }

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fff",
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
          marginBottom: 24,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5 }}>
            Dashboard
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: "#111827" }}>
            <span>Bienvenido</span>
            <span>{session.user.username ?? session.user.name}</span>
          </h1>
        </div>
      </header>
      

      {metricas ? (
        <section
          aria-label="Resumen general"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {metricas.map((metrica) => (
            <article
              key={metrica.titulo}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "clamp(16px, 2.5vw, 22px)",
                boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
                borderTop: `4px solid ${metrica.color}`,
                minWidth: 0,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", fontWeight: 600 }}>{metrica.titulo}</p>
              <p style={{ margin: "8px 0 0", fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 800, color: metrica.color }}>
                {new Intl.NumberFormat("es-CO").format(metrica.valor)}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
