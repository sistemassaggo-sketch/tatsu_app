ALTER TABLE "productos" ADD COLUMN "existencias" INTEGER NOT NULL DEFAULT 0;

-- Las existencias nunca pueden ser negativas.
ALTER TABLE "productos" ADD CONSTRAINT "productos_existencias_no_negativas"
  CHECK ("existencias" >= 0);

-- No hay datos reales de existencias todavía: la columna nace en 0 para todos los productos.
-- Se ajustan los que quedarían en un estado inconsistente con la regla de abajo (disponible sin
-- existencias), antes de poder exigirla.
UPDATE "productos" SET "disponibilidad" = false WHERE "existencias" = 0;

-- Si no hay existencias (0), el producto no puede estar marcado como disponible.
ALTER TABLE "productos" ADD CONSTRAINT "productos_disponibilidad_requiere_existencias"
  CHECK ("existencias" > 0 OR "disponibilidad" = false);
