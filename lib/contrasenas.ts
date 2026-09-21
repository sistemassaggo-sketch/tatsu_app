import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function cifrarContrasena(contrasena: string) {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(contrasena, sal, 64).toString("hex");

  return `scrypt:${sal}:${hash}`;
}

export function comprobarContrasena(contrasena: string, contrasenaCifrada: string) {
  const [algoritmo, sal, hashGuardado] = contrasenaCifrada.split(":");

  if (algoritmo !== "scrypt" || !sal || !hashGuardado) {
    return false;
  }

  const hashCalculado = scryptSync(contrasena, sal, 64);
  const hashEsperado = Buffer.from(hashGuardado, "hex");

  return hashCalculado.length === hashEsperado.length && timingSafeEqual(hashCalculado, hashEsperado);
}
