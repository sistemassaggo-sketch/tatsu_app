"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";

const menuItems = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Usuarios", href: "/dashboard/usuarios" },
  { label: "Clientes", href: "/dashboard/clientes" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const esAdministrador = session?.user?.role === "admin";
  const elementosMenu = esAdministrador
    ? menuItems
    : menuItems.filter((item) => !["/dashboard/usuarios", "/dashboard/clientes"].includes(item.href));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f7fb", color: "#111827" }}>
      <button
        type="button"
        className="botonMenu"
        aria-label="Abrir menú"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((value) => !value)}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 30,
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          border: "none",
          borderRadius: 12,
          background: "#176B87",
          color: "#fff",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 10px 24px rgba(23, 107, 135, 0.25)",
        }}
      >
        ☰
      </button>

      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            border: "none",
            background: "rgba(15, 23, 42, 0.35)",
            zIndex: 15,
            cursor: "pointer",
          }}
        />
      ) : null}

      <aside
        style={{
          width: 260,
          background: "#0f172a",
          color: "#f8fafc",
          padding: "24px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "relative",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800 }}>Atsu App</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {elementosMenu.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                  color: "#e2e8f0",
                  textDecoration: "none",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signOut({ callbackUrl: "/" });
          }}
          style={{ marginTop: "auto" }}
        >
          <button
            type="submit"
            style={{
              width: "100%",
              border: "none",
              borderRadius: 10,
              background: "#176B87",
              color: "#fff",
              padding: "12px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </aside>

      <main style={{ flex: 1, padding: 32, minWidth: 0 }}>{children}</main>

      <style jsx>{`
        @media (max-width: 768px) {
          .botonMenu {
            display: flex !important;
          }

          aside {
            position: fixed !important;
            inset: 0 auto 0 0;
            width: min(80vw, 280px) !important;
            transform: translateX(${isMenuOpen ? "0" : "-110%"});
            z-index: 20;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
          }

          main {
            padding: 72px 16px 20px !important;
          }
        }

        @media (min-width: 769px) {
          .botonMenu {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
