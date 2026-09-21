"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState, type ReactNode } from "react";
import { STORAGE_KEY } from "@/store/cotizacion";
import { puedeAccederARuta } from "@/lib/permisos";

const menuItems = [
  { label: "Resumen", href: "/dashboard" },
  { label: "Usuarios", href: "/dashboard/usuarios" },
  { label: "Clientes", href: "/dashboard/clientes" },
  { label: "Almacén", href: "/dashboard/almacen" },
  { label: "Legalizaciones", href: "/dashboard/legalizaciones" },
  { label: "Aprobación de precios", href: "/dashboard/aprobacion-precios" },
  { label: "Auditoría", href: "/dashboard/auditoria" },
  { label: "Reportes", href: "/dashboard/reportes" },
  { label: "Cotizaciones", href: "/dashboard/cotizaciones" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const nombreUsuario = session?.user?.username ?? session?.user?.name ?? "Usuario";
  const elementosMenu = menuItems.filter((item) => puedeAccederARuta(session?.user?.role, item.href));

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
          background: "#EA5C25",
          color: "#FFFFFF",
          padding: "24px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "relative",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
      >
        <div className="tituloSidebar" style={{ display: "flex", alignItems: "center", gap: 10, color: "#FFFFFF" }}>
          <div style={{ width: 34, height: 34, flexShrink: 0, position: "relative" }}>
            <Image
              src="/brand-logo.png"
              alt="Tatsu App"
              fill
              sizes="34px"
              priority
              style={{ objectFit: "contain" }}
            />
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>Tatsu App</span>
        </div>

        <div className="usuarioInfo" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 12px" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              color: "#FFFFFF",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M4 19C5.8 15.8 8.5 14.2 12 14.2C15.5 14.2 18.2 15.8 20 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span style={{ fontWeight: 700, overflowWrap: "anywhere", flex: 1, minWidth: 0 }}>{nombreUsuario}</span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (typeof window !== "undefined") {
                window.localStorage.removeItem(STORAGE_KEY);
              }
              // Sin redirección del servidor: se vuelve al login del mismo dominio en que está el usuario,
              // sin depender de NEXTAUTH_URL.
              void signOut({ redirect: false }).finally(() => {
                router.replace("/");
                router.refresh();
              });
            }}
            style={{ margin: 0 }}
          >
            <button
              type="submit"
              className="botonCerrarSesion"
              style={{
                border: "1px solid #176B87",
                borderRadius: 8,
                background: "#FFFFFF",
                color: "#176B87",
                padding: "8px 10px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Salir
            </button>
          </form>
        </div>

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
                  background: isActive ? "#F5F7FB" : "transparent",
                  color: isActive ? "#176B87" : "#FFFFFF",
                  textDecoration: "none",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 32, minWidth: 0 }}>{children}</main>

      <style jsx>{`
        .usuarioInfo {
          min-width: 0;
        }

        @media (max-width: 768px) {
          .botonMenu {
            display: flex !important;
          }

          .tituloSidebar {
            margin-top: 52px;
            padding-left: 2px;
            gap: 8px;
          }

          .tituloSidebar img {
            width: 28px !important;
            height: 28px !important;
          }

          .tituloSidebar span {
            font-size: 20px !important;
          }

          .usuarioInfo {
            gap: 8px;
          }

          .botonCerrarSesion {
            width: 100%;
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
