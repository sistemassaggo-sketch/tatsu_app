"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { FamiliaAplique, Prisma } from "@/generated/prisma/client";
import { registrarEventoAuditoria } from "@/lib/auditoria";

// Ante una carrera (dos pestañas creando/editando el mismo nombre a la vez), el chequeo previo por
// nombre puede no alcanzar a detectarlo: la restricción única de la base es la última línea de
// defensa. Se traduce a un mensaje amigable en vez de dejar que la excepción se propague.
function esErrorDeNombreDuplicado(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export type EstadoAccionInventario = { ok: boolean; mensaje: string } | null;

// El precio del producto es opcional: si viene vacío queda en null, si viene debe ser un número >= 0.
function parsearPrecioOpcional(
  formData: FormData,
  campo: string,
  etiqueta: string,
): { valor: number | null; error?: undefined } | { valor?: undefined; error: string } {
  const texto = String(formData.get(campo) ?? "").trim();

  if (!texto) {
    return { valor: null };
  }

  const valor = Number(texto);

  if (!Number.isFinite(valor) || valor < 0) {
    return { error: `${etiqueta} debe ser un número válido mayor o igual a 0.` };
  }

  return { valor };
}

// El cilindraje es opcional: si viene vacío queda en null, si viene debe ser un entero >= 0.
function parsearEnteroOpcional(
  formData: FormData,
  campo: string,
  etiqueta: string,
): { valor: number | null; error?: undefined } | { valor?: undefined; error: string } {
  const texto = String(formData.get(campo) ?? "").trim();

  if (!texto) {
    return { valor: null };
  }

  const valor = Number(texto);

  if (!Number.isInteger(valor) || valor < 0) {
    return { error: `${etiqueta} debe ser un número entero mayor o igual a 0.` };
  }

  return { valor };
}

// Texto opcional: cadena vacía se guarda como null en vez de "".
function parsearTextoOpcional(formData: FormData, campo: string) {
  const texto = String(formData.get(campo) ?? "").trim();
  return texto || null;
}

// Admin y almacén administran productos (precio, existencias, componentes, asignar colores ya
// existentes); el catálogo general de colores (crear/editar/inhabilitar) es exclusivo de admin.
const rolesInventario = ["admin", "almacen"] as const;

export async function actualizarProductoInventario(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (!sesion?.user?.role || !rolesInventario.includes(sesion.user.role as (typeof rolesInventario)[number])) {
    return { ok: false, mensaje: "No tienes permisos para modificar productos." };
  }

  const productoId = Number(formData.get("productoId"));
  const descripcionOriginal = String(formData.get("descripcionOriginal") ?? "").trim();
  const existenciasTexto = String(formData.get("existencias") ?? "").trim();

  if (!Number.isInteger(productoId)) {
    return { ok: false, mensaje: "Producto inválido." };
  }

  if (!descripcionOriginal) {
    return { ok: false, mensaje: "La descripción no puede estar vacía." };
  }

  const precioBase = parsearPrecioOpcional(formData, "precioBaseCop", "El precio");

  if (precioBase.error) {
    return { ok: false, mensaje: precioBase.error };
  }

  const existencias = Number(existenciasTexto);

  if (!Number.isInteger(existencias) || existencias < 0) {
    return { ok: false, mensaje: "Las existencias deben ser un número entero mayor o igual a 0." };
  }

  // Checkbox: solo viaja en el FormData cuando está marcado.
  const mostrarCliente = formData.get("mostrarCliente") === "true";

  const producto = await prisma.producto.findUnique({ where: { id: productoId } });

  if (!producto) {
    return { ok: false, mensaje: "El producto no existe." };
  }

  // --- Componentes: cantidades editadas, eliminaciones y componentes nuevos, tomados del mismo form. ---
  const componentesActuales = await prisma.productoComponente.findMany({
    where: { productoPadreId: productoId },
    select: { productoComponenteId: true },
  });

  const cantidadesComponente = new Map<number, number>();
  const componentesAEliminar = new Set<number>();
  const nuevosComponentes = new Map<number, { productoComponenteId: number; cantidad: number }>();

  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("cantidad-componente-")) {
      const id = Number(clave.replace("cantidad-componente-", ""));
      const cantidad = Number(valor);

      if (Number.isInteger(id) && Number.isInteger(cantidad) && cantidad > 0) {
        cantidadesComponente.set(id, cantidad);
      }
    } else if (clave.startsWith("eliminar-componente-")) {
      const id = Number(clave.replace("eliminar-componente-", ""));

      if (Number.isInteger(id) && String(valor) === "true") {
        componentesAEliminar.add(id);
      }
    } else if (clave.startsWith("nuevoComponenteProductoId-")) {
      const indice = Number(clave.replace("nuevoComponenteProductoId-", ""));
      const idComponente = Number(valor);

      if (Number.isInteger(idComponente) && idComponente > 0) {
        nuevosComponentes.set(indice, {
          productoComponenteId: idComponente,
          cantidad: nuevosComponentes.get(indice)?.cantidad ?? 1,
        });
      }
    } else if (clave.startsWith("nuevoComponenteCantidad-")) {
      const indice = Number(clave.replace("nuevoComponenteCantidad-", ""));
      const cantidad = Number(valor);

      if (Number.isInteger(cantidad) && cantidad > 0) {
        const existente = nuevosComponentes.get(indice);

        if (existente) {
          nuevosComponentes.set(indice, { ...existente, cantidad });
        }
      }
    }
  }

  // Los componentes nuevos se resuelven por id antes de escribir nada, para poder avisar con
  // claridad si alguno ya no existe, en vez de fallar a medio guardar.
  const componentesNuevosResueltos: { productoComponenteId: number; cantidad: number }[] = [];

  for (const { productoComponenteId, cantidad } of nuevosComponentes.values()) {
    const productoComponente = await prisma.producto.findUnique({
      where: { id: productoComponenteId },
      select: { id: true, codigo: true },
    });

    if (!productoComponente) {
      return { ok: false, mensaje: "Uno de los productos seleccionados como componente ya no existe." };
    }

    if (productoComponente.id === productoId) {
      return { ok: false, mensaje: "Un producto no puede ser componente de sí mismo." };
    }

    const yaEsComponente =
      componentesActuales.some((componente) => componente.productoComponenteId === productoComponente.id) ||
      componentesNuevosResueltos.some((componente) => componente.productoComponenteId === productoComponente.id);

    if (yaEsComponente) {
      return { ok: false, mensaje: `El producto "${productoComponente.codigo}" ya es un componente de este producto.` };
    }

    componentesNuevosResueltos.push({ productoComponenteId: productoComponente.id, cantidad });
  }

  // --- Colores: eliminaciones y colores nuevos asignados al producto, tomados del mismo form.
  // La disponibilidad de un color es global (Color.activo); acá solo se asigna o desasigna del
  // producto, sin existencias ni disponibilidad propias.
  const coloresActuales = await prisma.productoColor.findMany({
    where: { productoId },
    select: { colorId: true },
  });

  const coloresAEliminar = new Set<number>();
  const nuevosColoresIds = new Set<number>();

  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("eliminar-color-")) {
      const id = Number(clave.replace("eliminar-color-", ""));

      if (Number.isInteger(id) && String(valor) === "true") {
        coloresAEliminar.add(id);
      }
    } else if (clave.startsWith("nuevoColorId-")) {
      const colorId = Number(valor);

      if (Number.isInteger(colorId) && colorId > 0) {
        nuevosColoresIds.add(colorId);
      }
    }
  }

  // Los colores nuevos se eligen de los ya existentes en el catálogo general (activos); acá solo se
  // valida que existan y no estén ya asignados, antes de escribir nada.
  const coloresNuevosResueltos: number[] = [];

  for (const colorId of nuevosColoresIds) {
    const color = await prisma.color.findUnique({ where: { id: colorId }, select: { id: true, activo: true, nombre: true } });

    if (!color || !color.activo) {
      return { ok: false, mensaje: "Uno de los colores elegidos ya no está disponible." };
    }

    const yaTieneColor = coloresActuales.some((pc) => pc.colorId === color.id);

    if (yaTieneColor) {
      return { ok: false, mensaje: `El producto ya tiene configurado el color "${color.nombre}".` };
    }

    coloresNuevosResueltos.push(color.id);
  }

  // --- Apliques: mismo patrón que colores, asignación directa producto por producto vía
  // ProductoAplique (Aplique.familias es solo clasificación del catálogo, no gobierna esto).
  const apliquesActuales = await prisma.productoAplique.findMany({
    where: { productoId },
    select: { apliqueId: true },
  });

  const apliquesAEliminar = new Set<number>();
  const nuevosApliquesIds = new Set<number>();

  for (const [clave, valor] of formData.entries()) {
    if (clave.startsWith("eliminar-aplique-")) {
      const id = Number(clave.replace("eliminar-aplique-", ""));

      if (Number.isInteger(id) && String(valor) === "true") {
        apliquesAEliminar.add(id);
      }
    } else if (clave.startsWith("nuevoApliqueId-")) {
      const apliqueId = Number(valor);

      if (Number.isInteger(apliqueId) && apliqueId > 0) {
        nuevosApliquesIds.add(apliqueId);
      }
    }
  }

  const apliquesNuevosResueltos: number[] = [];

  for (const apliqueId of nuevosApliquesIds) {
    const aplique = await prisma.aplique.findUnique({ where: { id: apliqueId }, select: { id: true, activo: true, nombre: true } });

    if (!aplique || !aplique.activo) {
      return { ok: false, mensaje: "Uno de los apliques elegidos ya no está disponible." };
    }

    const yaTieneAplique = apliquesActuales.some((pa) => pa.apliqueId === aplique.id);

    if (yaTieneAplique) {
      return { ok: false, mensaje: `El producto ya tiene configurado el aplique "${aplique.nombre}".` };
    }

    apliquesNuevosResueltos.push(aplique.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.producto.update({
      where: { id: productoId },
      data: {
        descripcionOriginal,
        precioBaseCop: precioBase.valor ?? null,
        existencias,
        // Si las existencias quedan en más de 0, el producto vuelve a estar disponible automáticamente.
        ...(existencias > 0 ? { disponibilidad: true } : {}),
        // Guarda el valor previo solo cuando realmente cambia, para que refleje la última edición real.
        ...(existencias !== producto.existencias ? { existenciasAnterior: producto.existencias } : {}),
        mostrarCliente,
      },
    });

    for (const { productoComponenteId } of componentesActuales) {
      if (componentesAEliminar.has(productoComponenteId)) {
        await tx.productoComponente.delete({
          where: { productoPadreId_productoComponenteId: { productoPadreId: productoId, productoComponenteId } },
        });
        continue;
      }

      const nuevaCantidad = cantidadesComponente.get(productoComponenteId);

      if (nuevaCantidad !== undefined) {
        await tx.productoComponente.update({
          where: { productoPadreId_productoComponenteId: { productoPadreId: productoId, productoComponenteId } },
          data: { cantidadRequeridaComponente: nuevaCantidad },
        });
      }
    }

    for (const { productoComponenteId, cantidad } of componentesNuevosResueltos) {
      await tx.productoComponente.create({
        data: { productoPadreId: productoId, productoComponenteId, cantidadRequeridaComponente: cantidad },
      });
    }

    for (const { colorId } of coloresActuales) {
      if (coloresAEliminar.has(colorId)) {
        await tx.productoColor.delete({ where: { productoId_colorId: { productoId, colorId } } });
      }
    }

    for (const colorId of coloresNuevosResueltos) {
      await tx.productoColor.create({ data: { productoId, colorId } });
    }

    for (const { apliqueId } of apliquesActuales) {
      if (apliquesAEliminar.has(apliqueId)) {
        await tx.productoAplique.delete({ where: { productoId_apliqueId: { productoId, apliqueId } } });
      }
    }

    for (const apliqueId of apliquesNuevosResueltos) {
      await tx.productoAplique.create({ data: { productoId, apliqueId } });
    }
  });

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se actualizó el producto ${producto.codigo} (descripción, precio, existencias, componentes, colores y/o apliques) desde inventario.`,
    recurso: "productos",
    recursoId: productoId,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Producto actualizado correctamente." };
}

// Crea un producto nuevo en el catálogo (sin componentes ni colores todavía: esos se agregan
// después editando el producto ya creado).
export async function crearProducto(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (!sesion?.user?.role || !rolesInventario.includes(sesion.user.role as (typeof rolesInventario)[number])) {
    return { ok: false, mensaje: "No tienes permisos para crear productos." };
  }

  const codigo = String(formData.get("codigo") ?? "").trim();
  const descripcionOriginal = String(formData.get("descripcionOriginal") ?? "").trim();
  const existenciasTexto = String(formData.get("existencias") ?? "0").trim();

  if (!codigo) {
    return { ok: false, mensaje: "El código no puede estar vacío." };
  }

  if (!descripcionOriginal) {
    return { ok: false, mensaje: "La descripción no puede estar vacía." };
  }

  const precioBase = parsearPrecioOpcional(formData, "precioBaseCop", "El precio");

  if (precioBase.error) {
    return { ok: false, mensaje: precioBase.error };
  }

  const cilindraje = parsearEnteroOpcional(formData, "cilindraje", "El cilindraje");

  if (cilindraje.error) {
    return { ok: false, mensaje: cilindraje.error };
  }

  const existencias = Number(existenciasTexto || "0");

  if (!Number.isInteger(existencias) || existencias < 0) {
    return { ok: false, mensaje: "Las existencias deben ser un número entero mayor o igual a 0." };
  }

  // Checkbox: solo viaja en el FormData cuando está marcado.
  const mostrarCliente = formData.get("mostrarCliente") === "true";

  const producto = await prisma.producto.create({
    data: {
      codigo,
      descripcionOriginal,
      precioBaseCop: precioBase.valor ?? null,
      existencias,
      disponibilidad: existencias > 0,
      mostrarCliente,
      casaFamilia: parsearTextoOpcional(formData, "casaFamilia"),
      linea: parsearTextoOpcional(formData, "linea"),
      cilindraje: cilindraje.valor ?? null,
      version: parsearTextoOpcional(formData, "version"),
      tipoAcabado: parsearTextoOpcional(formData, "tipoAcabado"),
      detalles: parsearTextoOpcional(formData, "detalles"),
      lineaOriginal: parsearTextoOpcional(formData, "lineaOriginal"),
    },
  });

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "usuario";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se creó el producto ${producto.codigo} desde inventario.`,
    recurso: "productos",
    recursoId: producto.id,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Producto creado correctamente." };
}

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;

// Crea un color en el catálogo general (independiente de cualquier producto). Los colores
// disponibles para asignar a un producto son siempre los que ya existen aquí y están activos.
export async function crearColorGeneral(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para crear colores." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const hex = String(formData.get("hex") ?? "").trim();

  if (!nombre) {
    return { ok: false, mensaje: "El nombre del color no puede estar vacío." };
  }

  if (!HEX_VALIDO.test(hex)) {
    return { ok: false, mensaje: "Elige un color válido." };
  }

  const existente = await prisma.color.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });

  if (existente) {
    return { ok: false, mensaje: `Ya existe un color llamado "${existente.nombre}".` };
  }

  try {
    await prisma.color.create({ data: { nombre, hex } });
  } catch (error) {
    if (esErrorDeNombreDuplicado(error)) {
      return { ok: false, mensaje: `Ya existe un color llamado "${nombre}".` };
    }

    throw error;
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se creó el color "${nombre}" en el catálogo general desde inventario.`,
    recurso: "colores",
    recursoId: null,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Color creado correctamente." };
}

// Edita nombre/hex de un color del catálogo general.
export async function actualizarColorGeneral(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para editar colores." };
  }

  const colorId = Number(formData.get("colorId"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const hex = String(formData.get("hex") ?? "").trim();

  if (!Number.isInteger(colorId)) {
    return { ok: false, mensaje: "Color inválido." };
  }

  if (!nombre) {
    return { ok: false, mensaje: "El nombre del color no puede estar vacío." };
  }

  if (!HEX_VALIDO.test(hex)) {
    return { ok: false, mensaje: "Elige un color válido." };
  }

  const color = await prisma.color.findUnique({ where: { id: colorId } });

  if (!color) {
    return { ok: false, mensaje: "El color no existe." };
  }

  const otroConElMismoNombre = await prisma.color.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" }, id: { not: colorId } },
  });

  if (otroConElMismoNombre) {
    return { ok: false, mensaje: `Ya existe un color llamado "${otroConElMismoNombre.nombre}".` };
  }

  try {
    await prisma.color.update({ where: { id: colorId }, data: { nombre, hex } });
  } catch (error) {
    if (esErrorDeNombreDuplicado(error)) {
      return { ok: false, mensaje: `Ya existe un color llamado "${nombre}".` };
    }

    throw error;
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se editó el color "${color.nombre}" (ahora "${nombre}") en el catálogo general desde inventario.`,
    recurso: "colores",
    recursoId: colorId,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Color actualizado correctamente." };
}

// Habilita o inhabilita un color del catálogo general. Un color inhabilitado deja de poder
// asignarse a productos ni elegirse al cotizar, pero no se borra (las cotizaciones ya legalizadas
// siguen mostrando el color que se eligió en su momento).
export async function alternarColorActivo(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para inhabilitar colores." };
  }

  const colorId = Number(formData.get("colorId"));
  const activo = String(formData.get("activo") ?? "") === "true";

  if (!Number.isInteger(colorId)) {
    return { ok: false, mensaje: "Color inválido." };
  }

  const color = await prisma.color.findUnique({ where: { id: colorId } });

  if (!color) {
    return { ok: false, mensaje: "El color no existe." };
  }

  await prisma.color.update({ where: { id: colorId }, data: { activo } });

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se ${activo ? "habilitó" : "inhabilitó"} el color "${color.nombre}" en el catálogo general desde inventario.`,
    recurso: "colores",
    recursoId: colorId,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: activo ? "Color habilitado." : "Color inhabilitado." };
}

// --- Apliques: catálogo general (exclusivo de admin), igual que colores. Se asignan a un producto
// directamente vía ProductoAplique (ver actualizarProductoInventario); el campo `familias` es solo
// clasificación del aplique dentro del catálogo, no determina qué se ofrece al cotizar.

// Crea un aplique en el catálogo general (sin familias todavía: se agregan después).
export async function crearApliqueGeneral(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para crear apliques." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const hex = String(formData.get("hex") ?? "").trim();

  if (!nombre) {
    return { ok: false, mensaje: "El nombre del aplique no puede estar vacío." };
  }

  if (!HEX_VALIDO.test(hex)) {
    return { ok: false, mensaje: "Elige un color válido para el aplique." };
  }

  const existente = await prisma.aplique.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" } },
  });

  if (existente) {
    return { ok: false, mensaje: `Ya existe un aplique llamado "${existente.nombre}".` };
  }

  try {
    await prisma.aplique.create({ data: { nombre, hex } });
  } catch (error) {
    if (esErrorDeNombreDuplicado(error)) {
      return { ok: false, mensaje: `Ya existe un aplique llamado "${nombre}".` };
    }

    throw error;
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se creó el aplique "${nombre}" en el catálogo general desde inventario.`,
    recurso: "apliques",
    recursoId: null,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Aplique creado correctamente." };
}

// Edita el nombre de un aplique del catálogo general.
export async function actualizarApliqueGeneral(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para editar apliques." };
  }

  const apliqueId = Number(formData.get("apliqueId"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const hex = String(formData.get("hex") ?? "").trim();

  if (!Number.isInteger(apliqueId)) {
    return { ok: false, mensaje: "Aplique inválido." };
  }

  if (!nombre) {
    return { ok: false, mensaje: "El nombre del aplique no puede estar vacío." };
  }

  if (!HEX_VALIDO.test(hex)) {
    return { ok: false, mensaje: "Elige un color válido para el aplique." };
  }

  const aplique = await prisma.aplique.findUnique({ where: { id: apliqueId } });

  if (!aplique) {
    return { ok: false, mensaje: "El aplique no existe." };
  }

  const otroConElMismoNombre = await prisma.aplique.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" }, id: { not: apliqueId } },
  });

  if (otroConElMismoNombre) {
    return { ok: false, mensaje: `Ya existe un aplique llamado "${otroConElMismoNombre.nombre}".` };
  }

  try {
    await prisma.aplique.update({ where: { id: apliqueId }, data: { nombre, hex } });
  } catch (error) {
    if (esErrorDeNombreDuplicado(error)) {
      return { ok: false, mensaje: `Ya existe un aplique llamado "${nombre}".` };
    }

    throw error;
  }

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se editó el aplique "${aplique.nombre}" (ahora "${nombre}") en el catálogo general desde inventario.`,
    recurso: "apliques",
    recursoId: apliqueId,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Aplique actualizado correctamente." };
}

// Habilita o inhabilita un aplique del catálogo general (nunca se borra, igual que Color).
export async function alternarApliqueActivo(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para inhabilitar apliques." };
  }

  const apliqueId = Number(formData.get("apliqueId"));
  const activo = String(formData.get("activo") ?? "") === "true";

  if (!Number.isInteger(apliqueId)) {
    return { ok: false, mensaje: "Aplique inválido." };
  }

  const aplique = await prisma.aplique.findUnique({ where: { id: apliqueId } });

  if (!aplique) {
    return { ok: false, mensaje: "El aplique no existe." };
  }

  await prisma.aplique.update({ where: { id: apliqueId }, data: { activo } });

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se ${activo ? "habilitó" : "inhabilitó"} el aplique "${aplique.nombre}" en el catálogo general desde inventario.`,
    recurso: "apliques",
    recursoId: apliqueId,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: activo ? "Aplique habilitado." : "Aplique inhabilitado." };
}

const FAMILIAS_VALIDAS = new Set<string>(Object.values(FamiliaAplique));

// Reemplaza el conjunto de familias (clasificación) de un aplique, tomado de los checkboxes
// "familia-<APLIQUE_ID>" marcados en el form. Es solo metadata de catálogo; no afecta qué apliques
// puede ofrecer un producto al cotizar (eso lo determina ProductoAplique).
export async function actualizarFamiliasAplique(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para editar apliques." };
  }

  const apliqueId = Number(formData.get("apliqueId"));

  if (!Number.isInteger(apliqueId)) {
    return { ok: false, mensaje: "Aplique inválido." };
  }

  const aplique = await prisma.aplique.findUnique({ where: { id: apliqueId } });

  if (!aplique) {
    return { ok: false, mensaje: "El aplique no existe." };
  }

  const familias = formData
    .getAll("familia")
    .map((valor) => String(valor))
    .filter((valor) => FAMILIAS_VALIDAS.has(valor)) as FamiliaAplique[];

  await prisma.aplique.update({ where: { id: apliqueId }, data: { familias } });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Familias del aplique actualizadas." };
}
