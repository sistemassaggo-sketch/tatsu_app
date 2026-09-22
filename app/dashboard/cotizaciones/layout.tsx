"use client";

import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
import { store, cargarEstadoPersistido, leerEstadoPersistido, type AppDispatch } from "@/store/cotizacion";
import type { ReactNode } from "react";

// El store arranca vacío (igual en servidor y cliente, ver store/cotizacion.ts) y, ya montado, se
// completa con lo que haya en localStorage. Así el primer render del cliente coincide con el del
// servidor y no hay error de hidratación.
function CargarCarritoPersistido() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(cargarEstadoPersistido(leerEstadoPersistido()));
  }, [dispatch]);

  return null;
}

export default function CotizacionesLayout({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <CargarCarritoPersistido />
      {children}
    </Provider>
  );
}
