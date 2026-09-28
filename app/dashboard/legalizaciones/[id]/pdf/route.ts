import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { generarPdfDocumento } from "@/lib/pdf-documento";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();

  if (!sesion?.user?.role || !["admin", "almacen", "comercial"].includes(sesion.user.role)) {
    return new Response("No autorizado", { status: 403 });
  }

  const { id } = await params;
  const cotizacionId = Number(id);

  if (!Number.isInteger(cotizacionId)) {
    return new Response("Legalización inválida", { status: 400 });
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: true,
      vendedor: { select: { nombre: true, username: true, rol: { select: { nombre: true } } } },
      items: {
        where: { eliminado: false },
        include: { producto: true, color: { select: { nombre: true } }, aplique: { select: { nombre: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cotizacion || cotizacion.estado !== "LEGALIZADO") {
    return new Response("Legalización no encontrada", { status: 404 });
  }

  const codigo = cotizacion.codigoLegalizacion ?? cotizacion.codigo;

  // Si quien creó la cotización es un usuario rol "cliente" (auto-cotización), no se expone su
  // nombre como vendedor: en el PDF figura la empresa.
  const nombreVendedor =
    cotizacion.vendedor?.rol.nombre === "cliente"
      ? "TATSU MOTOS"
      : (cotizacion.vendedor?.nombre ?? cotizacion.vendedor?.username ?? "-");

  const bytes = await generarPdfDocumento({
    titulo: "DOCUMENTO EQUIVALENTE A LEGALIZACIÓN",
    codigo,
    cotizacionId: cotizacion.id,
    fecha: cotizacion.fechaCreacion,
    vendedor: nombreVendedor,
    cliente: cotizacion.cliente,
    items: cotizacion.items,
    descuentoPorcentaje: cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0,
    total: cotizacion.total,
    esLegalizacion: true,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="legalizacion-${codigo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
