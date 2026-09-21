import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DetalleCotizacionEditor from "../DetalleCotizacionEditor";

export default async function DetalleCotizacionAlmacenPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();

  if (!sesion?.user?.role || !["admin", "almacen"].includes(sesion.user.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const cotizacionId = Number(id);

  if (!Number.isInteger(cotizacionId)) {
    redirect("/dashboard/almacen");
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: true,
      items: {
        include: {
          producto: true,
        },
      },
    },
  });

  if (!cotizacion) {
    redirect("/dashboard/almacen");
  }

  if (cotizacion.estado !== "CREADO") {
    redirect("/dashboard/almacen");
  }

  const subtotal = cotizacion.items.reduce((total, item) => total + Number(item.subtotal), 0);

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Detalle de cotización</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Cliente: {cotizacion.cliente.nombre} · Código: {cotizacion.codigo}
      </p>

      <DetalleCotizacionEditor
        cotizacionId={cotizacion.id}
        itemsIniciales={cotizacion.items.map((item) => ({
          id: item.id,
          codigo: item.producto.codigo,
          descripcionOriginal: item.producto.descripcionOriginal,
          precioUnitario: Number(item.precioUnitario),
          cantidad: item.cantidad,
          eliminado: Boolean(item.eliminado),
          eliminadoPor: item.eliminadoPor ?? null,
          fechaEliminacion: item.fechaEliminacion ? item.fechaEliminacion.toISOString() : null,
        }))}
        totalInicial={Number(cotizacion.total ?? subtotal)}
        descuentoPorc={cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0}
      />
    </section>
  );
}

