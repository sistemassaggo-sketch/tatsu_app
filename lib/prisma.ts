import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL no está configurada.");
}

// Neon (y otros Postgres serverless) cierran las conexiones inactivas. El pool debe descartarlas
// pronto y no reutilizar una ya cerrada, y los errores de conexiones en reposo no deben tumbar el proceso.
const adapter = new PrismaPg(
  {
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  },
  { onPoolError: (error) => console.error("Error en el pool de PostgreSQL:", error) },
);

export function esErrorDeConexionCerrada(error: unknown) {
  return error instanceof Error && /ConnectionClosed|Connection terminated|ECONNRESET/i.test(`${error.name} ${error.message}`);
}

const OPERACIONES_DE_LECTURA = new Set(["findMany", "findFirst", "findUnique", "findFirstOrThrow", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);

function crearCliente() {
  return new PrismaClient({ adapter }).$extends({
    query: {
      $allOperations: async ({ operation, args, query }) => {
        try {
          return await query(args);
        } catch (error) {
          // Una lectura no tiene efectos secundarios: si la conexión estaba cerrada se reintenta una vez.
          if (OPERACIONES_DE_LECTURA.has(operation) && esErrorDeConexionCerrada(error)) {
            return query(args);
          }

          throw error;
        }
      },
    },
  });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: ReturnType<typeof crearCliente>;
};

export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
