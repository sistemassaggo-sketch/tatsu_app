// Módulos del dashboard a los que puede acceder cada rol (además del resumen en /dashboard).
// El rol "admin" accede a todo.
const modulosPorRol: Record<string, string[]> = {
  almacen: ["/dashboard/almacen", "/dashboard/legalizaciones"],
  comercial: ["/dashboard/cotizaciones", "/dashboard/legalizaciones"],
  // El rol "cliente" solo cotiza para su propio cliente asociado y no puede usar la opción minorista.
  cliente: ["/dashboard/cotizaciones"],
};

export function puedeAccederARuta(rol: string | null | undefined, ruta: string) {
  if (!rol) {
    return false;
  }

  if (rol === "admin" || ruta === "/dashboard") {
    return true;
  }

  return (modulosPorRol[rol] ?? []).some((modulo) => ruta === modulo || ruta.startsWith(`${modulo}/`));
}
