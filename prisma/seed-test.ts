// Seed idempotente para entornos de prueba (CI/local con .env.test): crea los roles que faltan
// (solo "cliente" viene de una migración real; admin/almacen/comercial se crearon a mano en el dev
// local, así que una base recién migrada no los tiene) y un usuario de prueba por rol. Correr con:
//   npx tsx prisma/seed-test.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { cifrarContrasena } from "../lib/contrasenas";
import { CONTRASENA_PRUEBA, USUARIOS_PRUEBA, CLIENTE_PRUEBA_NOMBRE } from "../tests/fixtures/usuarios-prueba";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está configurada.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const rolesPorNombre = new Map<string, number>();

  for (const nombre of Object.keys(USUARIOS_PRUEBA) as (keyof typeof USUARIOS_PRUEBA)[]) {
    const rol = await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    rolesPorNombre.set(nombre, rol.id);
  }

  const cliente = await prisma.cliente.upsert({
    where: { nombre: CLIENTE_PRUEBA_NOMBRE },
    update: {},
    create: {
      nombre: CLIENTE_PRUEBA_NOMBRE,
      personaContacto: "Contacto de prueba",
      telefono: "3000000000",
      direccion: "Calle de prueba 123",
      ciudad: "Bogotá",
    },
  });

  const contrasenaCifrada = cifrarContrasena(CONTRASENA_PRUEBA);

  for (const [rol, username] of Object.entries(USUARIOS_PRUEBA)) {
    const rolId = rolesPorNombre.get(rol)!;
    const clienteId = rol === "cliente" ? cliente.id : null;

    await prisma.usuario.upsert({
      where: { username },
      update: {
        password: contrasenaCifrada,
        rolId,
        status: true,
        debeRestablecerContrasena: false,
        clienteId,
      },
      create: {
        username,
        password: contrasenaCifrada,
        rolId,
        status: true,
        nombre: username,
        clienteId,
      },
    });
  }

  console.log("Usuarios de prueba listos:", Object.values(USUARIOS_PRUEBA).join(", "));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
