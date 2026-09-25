// Separa un texto de búsqueda en palabras, ignorando espacios repetidos o mal puestos. Cada llamador
// arma su propio filtro Prisma exigiendo estas palabras con AND (todas deben aparecer, en cualquier
// campo) para que el orden en que se escriban no importe.
export function palabrasBusqueda(busqueda: string): string[] {
  return busqueda.trim().split(/\s+/).filter(Boolean);
}
