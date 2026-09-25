import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { generarPdfDocumento } from "@/lib/pdf-documento";
import { ESTADOS_HISTORIAL } from "../../utilidades";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();

  if (!sesion?.user?.role || !["admin", "comercial", "cliente"].includes(sesion.user.role)) {
    return new Response("No autorizado", { status: 403 });
  }

  const esRolCliente = sesion.user.role === "cliente";

  // El rol "cliente" solo puede descargar el PDF de cotizaciones de su propio cliente asociado.
  let clienteIdPropio: number | null = null;

  if (esRolCliente) {
    const usuarioSesion = await prisma.usuario.findUnique({
      where: { username: sesion.user.username ?? "" },
      select: { clienteId: true },
    });

    clienteIdPropio = usuarioSesion?.clienteId ?? null;

    if (!clienteIdPropio) {
      return new Response("No autorizado", { status: 403 });
    }
  }

  const { id } = await params;
  const cotizacionId = Number(id);

  if (!Number.isInteger(cotizacionId)) {
    return new Response("Cotización inválida", { status: 400 });
  }

  // Se incluyen todos los productos de la cotización, también los marcados como eliminados.
  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: true,
      vendedor: { select: { nombre: true, username: true, rol: { select: { nombre: true } } } },
      items: { include: { producto: true, color: { select: { nombre: true } } }, orderBy: { id: "asc" } },
    },
  });

  if (!cotizacion || !ESTADOS_HISTORIAL.includes(cotizacion.estado)) {
    return new Response("Cotización no encontrada", { status: 404 });
  }

  if (clienteIdPropio && cotizacion.clienteId !== clienteIdPropio) {
    return new Response("No autorizado", { status: 403 });
  }

  // Si quien creó la cotización es un usuario rol "cliente" (auto-cotización), no se expone su
  // nombre como vendedor: en el PDF figura la empresa.
  const nombreVendedor =
    cotizacion.vendedor?.rol.nombre === "cliente"
      ? "TATSU MOTOS"
      : (cotizacion.vendedor?.nombre ?? cotizacion.vendedor?.username ?? "-");

  const bytes = await generarPdfDocumento({
    titulo: "DOCUMENTO EQUIVALENTE A COTIZACIÓN",
    codigo: cotizacion.codigo,
    cotizacionId: cotizacion.id,
    fecha: cotizacion.fechaCreacion,
    vendedor: nombreVendedor,
    cliente: cotizacion.cliente,
    items: cotizacion.items,
    descuentoPorcentaje: cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0,
    total: cotizacion.total,
    esLegalizacion: false,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cotizacion-${cotizacion.codigo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
