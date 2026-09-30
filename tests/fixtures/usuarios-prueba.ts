// Usuarios de prueba para E2E, compartidos entre el seed (prisma/seed-test.ts) y los specs de
// Playwright: una sola fuente de verdad para que no se desincronicen usuario/contraseña.
export const CONTRASENA_PRUEBA = "Test1234!";

export const USUARIOS_PRUEBA = {
  admin: "admin_e2e",
  almacen: "almacen_e2e",
  comercial: "comercial_e2e",
  cliente: "cliente_e2e",
} as const;

export const CLIENTE_PRUEBA_NOMBRE = "Cliente E2E";
