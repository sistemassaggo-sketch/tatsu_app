import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import BotonDescargarPdf from "../../BotonDescargarPdf";

export default async function DetalleLegalizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();

  if (!sesion?.user?.role || !["admin", "almacen", "comercial"].includes(sesion.user.role)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const cotizacionId = Number(id);

  if (!Number.isInteger(cotizacionId)) {
    redirect("/dashboard/legalizaciones");
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: true,
      items: {
        where: { eliminado: false },
        include: { producto: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cotizacion || cotizacion.estado !== "LEGALIZADO") {
    redirect("/dashboard/legalizaciones");
  }

  const subtotal = cotizacion.items.reduce((total, item) => total + Number(item.subtotal), 0);
  const porcentajeDescuento = cotizacion.descuentoActivo ? Number(cotizacion.descuentoPorc ?? 0) : 0;
  const descuento = (subtotal * porcentajeDescuento) / 100;

  return (
    <section
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "clamp(20px, 3vw, 28px)",
        boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Detalle de legalización</h2>
      <p style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        Cliente: {cotizacion.cliente.nombre} · Código de legalización: {cotizacion.codigoLegalizacion ?? cotizacion.codigo}
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th style={estiloCelda}>Producto</th>
              <th style={{ ...estiloCelda, textAlign: "right" }}>Precio</th>
              <th style={{ ...estiloCelda, textAlign: "right" }}>Cantidad</th>
              <th style={{ ...estiloCelda, textAlign: "right" }}>Precio total</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={estiloCelda}>
                  <strong>{item.producto.codigo}</strong>
                  <div style={{ color: "#475569" }}>{item.producto.descripcionOriginal}</div>
                </td>
                <td style={{ ...estiloCelda, textAlign: "right" }}>{formatearCop(Number(item.precioUnitario))}</td>
                <td style={{ ...estiloCelda, textAlign: "right" }}>{item.cantidad}</td>
                <td style={{ ...estiloCelda, textAlign: "right", fontWeight: 700 }}>{formatearCop(Number(item.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, display: "grid", gap: 8, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <strong>{formatearCop(subtotal)}</strong>
        </div>
        {porcentajeDescuento > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Descuento ({porcentajeDescuento}%)</span>
            <strong>-{formatearCop(descuento)}</strong>
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ color: "#176B87" }}>{formatearCop(Number(cotizacion.total ?? subtotal - descuento))}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
      <BotonDescargarPdf
        href={`/dashboard/legalizaciones/${cotizacion.id}/pdf`}
        nombreArchivo={`legalizacion-${cotizacion.codigoLegalizacion ?? cotizacion.codigo}.pdf`}
      />
      <Link
        href="/dashboard/legalizaciones"
        style={{
          display: "inline-block",
          border: "1px solid #176B87",
          borderRadius: 8,
          color: "#176B87",
          padding: "11px 16px",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        Volver
      </Link>
      </div>
    </section>
  );
}

const estiloCelda = { padding: "12px 10px", verticalAlign: "top" as const };

function formatearCop(valor: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
}
