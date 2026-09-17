-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('CREADO', 'REVISION_ALMACEN', 'APROBACION_PRECIO', 'NO_APROBADO', 'LEGALIZADO');

-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "estado" "EstadoCotizacion" NOT NULL DEFAULT 'CREADO';
