import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ESTADOS_HISTORIAL, formatearCop, formatearFecha } from "../utilidades";

export default async function DetalleCotizacionHistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await auth();

  if (!sesion?.user?.role || !["admin", "comercial", "cliente"].includes(sesion.user.role)) {
    redirect("/dashboard");
  }

  const esRolCliente = sesion.user.role === "cliente";

  // El rol "cliente" solo puede ver el detalle de cotizaciones de su propio cliente asociado.
  let clienteIdPropio: number | null = null;

  if (esRolCliente) {
    const usuarioSesion = await prisma.usuario.findUnique({
      where: { username: sesion.user.username ?? "" },
      select: { clienteId: true },
    });

    clienteIdPropio = usuarioSesion?.clienteId ?? null;

    if (!clienteIdPropio) {
      redirect("/dashboard/cotizaciones");
    }
  }

  const { id } = await params;
  const cotizacionId = Number(id);

  if (!Number.isInteger(cotizacionId)) {
    redirect("/dashboard/cotizaciones/historial");
  }

  const cotizacion = await prisma.cotizacion.findUnique({
    where: { id: cotizacionId },
    include: {
      cliente: true,
      items: {
        where: { eliminado: false },
        include: {
          producto: true,
          color: { select: { nombre: true, hex: true } },
          aplique: { select: { nombre: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!cotizacion || !ESTADOS_HISTORIAL.includes(cotizacion.estado)) {
    redirect("/dashboard/cotizaciones/historial");
  }

  if (clienteIdPropio && cotizacion.clienteId !== clienteIdPropio) {
    redirect("/dashboard/cotizaciones/historial");
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
      <h2 style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", marginBottom: 8 }}>Detalle de cotización</h2>
      <div style={{ color: "#475569", lineHeight: 1.7, marginBottom: 24 }}>
        <p style={{ margin: 0, overflowWrap: "anywhere" }}>Código: <strong>{cotizacion.codigo}</strong></p>
        <p style={{ margin: 0 }}>Cliente: {cotizacion.cliente.nombre}</p>
        <p style={{ margin: 0 }}>Estado: <strong>{esRolCliente ? "Cotización recibida" : cotizacion.estado}</strong></p>
        <p style={{ margin: 0 }}>Fecha: {formatearFecha(cotizacion.fechaCreacion)}</p>
      </div>

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
                  {item.color ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8, fontSize: 13, color: "#475569" }}>
                      <span
                        aria-hidden="true"
                        style={{ width: 12, height: 12, borderRadius: "50%", background: item.color.hex, border: "1px solid #cbd5e1", display: "inline-block" }}
                      />
                      {item.color.nombre}
                    </span>
                  ) : null}
                  {item.aplique ? (
                    <span style={{ marginLeft: 8, fontSize: 13, color: "#475569" }}>Aplique: {item.aplique.nombre}</span>
                  ) : null}
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

      <Link
        href="/dashboard/cotizaciones/historial"
        style={{
          display: "inline-block",
          marginTop: 20,
          border: "1px solid #176B87",
          borderRadius: 8,
          color: "#176B87",
          padding: "11px 16px",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        Volver al historial
      </Link>
    </section>
  );
}

const estiloCelda = { padding: "12px 10px", verticalAlign: "top" as const };
