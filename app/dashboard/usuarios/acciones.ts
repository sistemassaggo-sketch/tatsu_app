"use server";

import { randomBytes, scryptSync } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";

const rolesPermitidos = ["almacen", "comercial"] as const;

export type EstadoFormularioUsuario = {
  error?: string;
  exito?: string;
};

function cifrarContrasena(contrasena: string) {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(contrasena, sal, 64).toString("hex");

  return `scrypt:${sal}:${hash}`;
}

export async function crearUsuario(
  _estadoAnterior: EstadoFormularioUsuario,
  datosFormulario: FormData,
): Promise<EstadoFormularioUsuario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { error: "No tienes permisos para crear usuarios." };
  }

  const username = String(datosFormulario.get("username") ?? "").trim();
  const password = String(datosFormulario.get("password") ?? "");
  const rolId = Number(datosFormulario.get("rolId"));

  if (!username || !password || !Number.isInteger(rolId)) {
    return { error: "Completa usuario, contraseña y rol." };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const rol = await prisma.rol.findUnique({
      where: { id: rolId },
    });

    if (!rol || !rolesPermitidos.includes(rol.nombre as (typeof rolesPermitidos)[number])) {
      return { error: "El rol seleccionado no está permitido." };
    }

    await prisma.usuario.create({
      data: {
        username,
        password: cifrarContrasena(password),
        rolId,
      },
    });

    revalidatePath("/dashboard/usuarios");
    return { exito: "Usuario creado correctamente." };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "El nombre de usuario ya existe." };
    }

    console.error("Error creando usuario:", error);
    return { error: "No fue posible crear el usuario." };
  }
}

export async function restablecerContrasena(
  _estadoAnterior: EstadoFormularioUsuario,
  datosFormulario: FormData,
): Promise<EstadoFormularioUsuario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { error: "No tienes permisos para restablecer contraseñas." };
  }

  const usuarioId = Number(datosFormulario.get("usuarioId"));
  const nuevaContrasena = String(datosFormulario.get("nuevaContrasena") ?? "");

  if (!Number.isInteger(usuarioId) || !nuevaContrasena) {
    return { error: "Completa la nueva contraseña." };
  }

  if (nuevaContrasena.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  try {
    const resultado = await prisma.usuario.updateMany({
      where: { id: usuarioId },
      data: { password: cifrarContrasena(nuevaContrasena) },
    });

    if (resultado.count === 0) {
      return { error: "El usuario no existe." };
    }

    revalidatePath("/dashboard/usuarios");
    return { exito: "Contraseña restablecida correctamente." };
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);
    return { error: "No fue posible restablecer la contraseña." };
  }
}

export async function cambiarEstadoUsuario(datosFormulario: FormData) {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return;
  }

  const usuarioId = Number(datosFormulario.get("usuarioId"));
  const estadoNuevo = datosFormulario.get("estadoNuevo") === "true";

  if (!Number.isInteger(usuarioId)) {
    return;
  }

  await prisma.usuario.updateMany({
    where: { id: usuarioId },
    data: { status: estadoNuevo },
  });

  revalidatePath("/dashboard/usuarios");
}