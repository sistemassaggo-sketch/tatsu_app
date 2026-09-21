// Las fechas se guardan en UTC; al mostrarlas siempre se convierten a la hora de Colombia (Bogotá).
export const ZONA_HORARIA = "America/Bogota";

const formateadorFechaHora = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ZONA_HORARIA,
});

export function formatearFechaHora(fecha: Date | string) {
  return formateadorFechaHora.format(new Date(fecha));
}

const formateadorFechaCodigo = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ZONA_HORARIA,
});

/** Fecha actual de Colombia como AAAAMMDD, para los códigos de cotización y legalización. */
export function fechaCodigoColombia(fecha: Date = new Date()) {
  return formateadorFechaCodigo.format(fecha).replace(/-/g, "");
}
