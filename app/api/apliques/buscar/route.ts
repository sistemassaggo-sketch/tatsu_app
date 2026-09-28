import { auth } from "@/app/auth";
import prisma from "@/lib/prisma";
import { palabrasBusqueda } from "@/lib/busqueda";
import { NextResponse } from "next/server";

// Búsqueda liviana de apliques activos (para asignar un aplique a un producto desde inventario).
export async function GET(request: Request) {
  const sesion = await auth();

  if (!["admin", "almacen"].includes(sesion?.user.role ?? "")) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const busqueda = (searchParams.get("q") ?? "").trim();
  const palabras = palabrasBusqueda(busqueda);

  if (palabras.length === 0) {
    return NextResponse.json({ apliques: [] });
  }

  const apliques = await prisma.aplique.findMany({
    where: {
      activo: true,
      AND: palabras.map((palabra) => ({ nombre: { contains: palabra, mode: "insensitive" as const } })),
    },
    orderBy: { nombre: "asc" },
    take: 10,
    select: { id: true, nombre: true, hex: true },
  });

  return NextResponse.json({ apliques });
}
