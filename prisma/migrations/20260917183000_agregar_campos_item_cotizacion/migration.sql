-- AlterTable
ALTER TABLE "item_cotizacion"
ADD COLUMN "eliminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "eliminado_por" VARCHAR(100),
ADD COLUMN "fecha_eliminacion" TIMESTAMP(3);
