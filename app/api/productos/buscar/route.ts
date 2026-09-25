import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { palabrasBusqueda } from "@/lib/busqueda";
import { NextResponse } from "next/server";

// Búsqueda liviana de productos (para elegir componentes desde inventario). Solo admin: es el único
// rol que administra inventario/componentes.
export async function GET(request: Request) {
  const sesion = await auth();

  if (sesion?.user?.role !== "admin") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const busqueda = (searchParams.get("q") ?? "").trim();
  const palabras = palabrasBusqueda(busqueda);

  if (palabras.length === 0) {
    return NextResponse.json({ productos: [] });
  }

  const productos = await prisma.producto.findMany({
    where: {
      AND: palabras.map((palabra) => ({
        OR: [
          { codigo: { contains: palabra, mode: "insensitive" as const } },
          { descripcionOriginal: { contains: palabra, mode: "insensitive" as const } },
        ],
      })),
    },
    orderBy: { codigo: "asc" },
    take: 10,
    select: { id: true, codigo: true, descripcionOriginal: true },
  });

  return NextResponse.json({ productos });
}
