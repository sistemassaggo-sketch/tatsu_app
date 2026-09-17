-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "eliminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eliminado_por" VARCHAR(120),
ADD COLUMN     "fecha_eliminacion" TIMESTAMP(3);
