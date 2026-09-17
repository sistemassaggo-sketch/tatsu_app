import { auth } from "@/app/auth";
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

      <section
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "clamp(20px, 3vw, 28px)",
          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
        }}
      >
        <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 10 }}>Resumen</h2>
        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Este es el panel principal del sistema. Aquí podrás acceder a los diferentes módulos desde el menú lateral.
        </p>
      </section>
    </>
  );
}
