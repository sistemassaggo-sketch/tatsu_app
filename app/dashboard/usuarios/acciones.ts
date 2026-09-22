"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { cifrarContrasena } from "@/lib/contrasenas";
import { registrarEventoAuditoria } from "@/lib/auditoria";

const rolesPermitidos = ["almacen", "comercial", "cliente"] as const;

export type EstadoFormularioUsuario = {
  error?: string;
  exito?: string;
};

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
  const nombre = String(datosFormulario.get("vendedor") ?? "").trim();
  const clienteIdTexto = String(datosFormulario.get("clienteId") ?? "").trim();

  if (!username || !password || !nombre || !Number.isInteger(rolId)) {
    return { error: "Completa usuario, contraseña, vendedor y rol." };
  }

  if (nombre.length > 150) {
    return { error: "El nombre del vendedor no puede superar 150 caracteres." };
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

    // El rol "cliente" siempre debe quedar asociado a un cliente existente; los demás roles no llevan cliente.
    let clienteId: number | null = null;

    if (rol.nombre === "cliente") {
      clienteId = Number(clienteIdTexto);

      if (!clienteIdTexto || !Number.isInteger(clienteId)) {
        return { error: "Selecciona el cliente con el que se debe asociar este usuario." };
      }

      const clienteExiste = await prisma.cliente.findUnique({ where: { id: clienteId } });

      if (!clienteExiste) {
        return { error: "El cliente seleccionado no existe." };
      }
    }

    await prisma.usuario.create({
      data: {
        username,
        password: cifrarContrasena(password),
        nombre,
        rolId,
        clienteId,
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

export async function solicitarRestablecimientoContrasena(datosFormulario: FormData) {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return;
  }

  const usuarioId = Number(datosFormulario.get("usuarioId"));

  if (!Number.isInteger(usuarioId)) {
    return;
  }

  const usuario = await prisma.usuario.update({
    where: { id: usuarioId },
    data: { debeRestablecerContrasena: true },
    select: { username: true },
  }).catch(() => null);

  if (!usuario) {
    return;
  }

  const admin = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: admin,
    usuarioId: Number((sesion.user as { id?: string }).id ?? 0) || null,
    accion: "SOLICITAR_RESTABLECIMIENTO",
    descripcion: `El administrador ${admin} solicitó restablecer la contraseña de ${usuario.username}.`,
    recurso: "usuarios",
    recursoId: usuarioId,
  });

  revalidatePath("/dashboard/usuarios");
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