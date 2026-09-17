"use client";

import { Provider } from "react-redux";
import { store } from "@/store/cotizacion";
import type { ReactNode } from "react";

export default function CotizacionesLayout({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
