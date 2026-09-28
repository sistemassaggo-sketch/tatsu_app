"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function ProveedorSesion({ children }: { children: ReactNode }) {
  // Sondea /api/auth/session cada 5 min (igual a updateAge en app/auth.ts) mientras la pestaña esté
  // abierta, y también al recuperar el foco, para que la sesión se renueve mientras el usuario esté
  // activo en vez de vencer siempre a los 30 min fijos.
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}