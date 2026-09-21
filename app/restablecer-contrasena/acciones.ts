"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { cifrarContrasena, comprobarContrasena } from "@/lib/contrasenas";
import { registrarEventoAuditoria } from "@/lib/auditoria";

export type EstadoRestablecimiento = { error?: string };

export async function completarRestablecimiento(
  _estadoAnterior: EstadoRestablecimiento,
  datosFormulario: FormData,
): Promise<EstadoRestablecimiento> {
  const username = String(datosFormulario.get("username") ?? "").trim();
  const contrasenaActual = String(datosFormulario.get("contrasenaActual") ?? "");
  const nuevaContrasena = String(datosFormulario.get("nuevaContrasena") ?? "");
  const confirmacion = String(datosFormulario.get("confirmacion") ?? "");

  if (!username || !contrasenaActual || !nuevaContrasena) {
    return { error: "Completa todos los campos." };
  }

  if (nuevaContrasena.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  if (nuevaContrasena !== confirmacion) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }

  if (nuevaContrasena === contrasenaActual) {
    return { error: "La nueva contraseña debe ser distinta a la actual." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { username } });

  if (
    !usuario ||
    !usuario.status ||
    !usuario.debeRestablecerContrasena ||
    !comprobarContrasena(contrasenaActual, usuario.password)
  ) {
    return { error: "Usuario o contraseña actual incorrectos, o no tienes un restablecimiento pendiente." };
  }

  const actualizado = await prisma.usuario.updateMany({
    where: { id: usuario.id, debeRestablecerContrasena: true },
    data: { password: cifrarContrasena(nuevaContrasena), debeRestablecerContrasena: false },
  });

  if (actualizado.count === 0) {
    return { error: "El restablecimiento ya no está pendiente." };
  }

  await registrarEventoAuditoria({
    usuario: usuario.username,
    usuarioId: usuario.id,
    accion: "RESTABLECER_CONTRASENA",
    descripcion: `El usuario ${usuario.username} restableció su contraseña.`,
    recurso: "usuarios",
    recursoId: usuario.id,
  });

  redirect("/?restablecida=1");
}
