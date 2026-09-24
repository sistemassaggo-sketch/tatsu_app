"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { registrarEventoAuditoria } from "@/lib/auditoria";

export type EstadoAccionInventario = { ok: boolean; mensaje: string } | null;

export async function actualizarProductoInventario(
  _estadoPrevio: EstadoAccionInventario,
  formData: FormData,
): Promise<EstadoAccionInventario> {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return { ok: false, mensaje: "No tienes permisos para modificar productos." };
  }

  const productoId = Number(formData.get("productoId"));
  const descripcionOriginal = String(formData.get("descripcionOriginal") ?? "").trim();
  const precioTexto = String(formData.get("precioBaseCop") ?? "").trim();
  const existenciasTexto = String(formData.get("existencias") ?? "").trim();

  if (!Number.isInteger(productoId)) {
    return { ok: false, mensaje: "Producto inválido." };
  }

  if (!descripcionOriginal) {
    return { ok: false, mensaje: "La descripción no puede estar vacía." };
  }

  const precioBaseCop = precioTexto ? Number(precioTexto) : null;

  if (precioTexto && (!Number.isFinite(precioBaseCop) || precioBaseCop! < 0)) {
    return { ok: false, mensaje: "El precio debe ser un número válido mayor o igual a 0." };
  }

  const existencias = Number(existenciasTexto);

  if (!Number.isInteger(existencias) || existencias < 0) {
    return { ok: false, mensaje: "Las existencias deben ser un número entero mayor o igual a 0." };
  }

  const producto = await prisma.producto.findUnique({ where: { id: productoId } });

  if (!producto) {
    return { ok: false, mensaje: "El producto no existe." };
  }

  await prisma.producto.update({
    where: { id: productoId },
    data: {
      descripcionOriginal,
      precioBaseCop,
      existencias,
      // Si las existencias quedan en más de 0, el producto vuelve a estar disponible automáticamente.
      ...(existencias > 0 ? { disponibilidad: true } : {}),
    },
  });

  const nombreUsuario = sesion.user.username ?? sesion.user.name ?? "admin";

  await registrarEventoAuditoria({
    usuario: nombreUsuario,
    usuarioId: Number(sesion.user?.id ?? 0) || null,
    accion: "MODIFICAR_PRODUCTO",
    descripcion: `Se actualizó el producto ${producto.codigo} (descripción y/o precio) desde inventario.`,
    recurso: "productos",
    recursoId: productoId,
  });

  revalidatePath("/dashboard/inventario");

  return { ok: true, mensaje: "Producto actualizado correctamente." };
}
