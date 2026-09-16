"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";

const rutaClientes = "/dashboard/clientes";

export type EstadoFormularioCliente = {
  error?: string;
  exito?: string;
};

function obtenerDatosCliente(datosFormulario: FormData) {
  return {
    nombre: String(datosFormulario.get("nombre") ?? "").trim(),
    personaContacto: String(datosFormulario.get("personaContacto") ?? "").trim(),
    telefono: String(datosFormulario.get("telefono") ?? "").trim(),
    direccion: String(datosFormulario.get("direccion") ?? "").trim(),
    ciudad: String(datosFormulario.get("ciudad") ?? "").trim(),
  };
}

function validarDatosCliente(datos: ReturnType<typeof obtenerDatosCliente>) {
  if (Object.values(datos).some((dato) => !dato)) {
    return "Completa todos los campos del cliente.";
  }

  if (datos.telefono.length < 7) {
    return "Ingresa un teléfono válido.";
  }

  return null;
}

async function comprobarAdministrador() {
  const sesion = await auth();
  return sesion?.user?.role === "admin" && sesion.user.status === true;
}

export async function crearCliente(
  _estadoAnterior: EstadoFormularioCliente,
  datosFormulario: FormData,
): Promise<EstadoFormularioCliente> {
  if (!(await comprobarAdministrador())) {
    return { error: "No tienes permisos para crear clientes." };
  }

  const datosCliente = obtenerDatosCliente(datosFormulario);
  const errorValidacion = validarDatosCliente(datosCliente);

  if (errorValidacion) {
    return { error: errorValidacion };
  }

  try {
    await prisma.cliente.create({ data: datosCliente });
    revalidatePath(rutaClientes);
    return { exito: "Cliente creado correctamente." };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "Ya existe un cliente con ese nombre." };
    }

    console.error("Error creando cliente:", error);
    return { error: "No fue posible crear el cliente." };
  }
}

export async function editarCliente(
  _estadoAnterior: EstadoFormularioCliente,
  datosFormulario: FormData,
): Promise<EstadoFormularioCliente> {
  if (!(await comprobarAdministrador())) {
    return { error: "No tienes permisos para editar clientes." };
  }

  const clienteId = Number(datosFormulario.get("clienteId"));
  const datosCliente = obtenerDatosCliente(datosFormulario);
  const errorValidacion = validarDatosCliente(datosCliente);

  if (!Number.isInteger(clienteId) || errorValidacion) {
    return { error: errorValidacion ?? "El cliente seleccionado no es válido." };
  }

  try {
    await prisma.cliente.update({ where: { id: clienteId }, data: datosCliente });
    revalidatePath(rutaClientes);
    return { exito: "Cliente actualizado correctamente." };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { error: "Ya existe un cliente con ese nombre." };
    }

    console.error("Error editando cliente:", error);
    return { error: "No fue posible actualizar el cliente." };
  }
}

export async function cambiarEstadoCliente(datosFormulario: FormData) {
  if (!(await comprobarAdministrador())) {
    return;
  }

  const clienteId = Number(datosFormulario.get("clienteId"));
  const estadoNuevo = datosFormulario.get("estadoNuevo") === "true";

  if (!Number.isInteger(clienteId)) {
    return;
  }

  await prisma.cliente.updateMany({
    where: { id: clienteId },
    data: { status: estadoNuevo },
  });

  revalidatePath(rutaClientes);
}