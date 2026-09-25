import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { palabrasBusqueda } from "@/lib/busqueda";
import { NextResponse } from "next/server";

// Búsqueda liviana de colores activos (para elegir el color de un producto desde inventario). Solo
// admin: es el único rol que administra inventario/colores.
export async function GET(request: Request) {
  const sesion = await auth();

  if (!["admin", "almacen"].includes(sesion?.user.role ?? "")) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const busqueda = (searchParams.get("q") ?? "").trim();
  const palabras = palabrasBusqueda(busqueda);

  if (palabras.length === 0) {
    return NextResponse.json({ colores: [] });
  }

  const colores = await prisma.color.findMany({
    where: {
      activo: true,
      AND: palabras.map((palabra) => ({ nombre: { contains: palabra, mode: "insensitive" as const } })),
    },
    orderBy: { nombre: "asc" },
    take: 10,
    select: { id: true, nombre: true, hex: true },
  });

  return NextResponse.json({ colores });
}
