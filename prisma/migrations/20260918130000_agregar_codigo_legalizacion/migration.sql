ALTER TABLE "cotizaciones" ADD COLUMN "codigo_legalizacion" VARCHAR(50);

UPDATE "cotizaciones"
SET "codigo_legalizacion" = 'LEG-' || to_char("fecha_creacion", 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || "id"::text), 1, 8))
WHERE "estado" = 'LEGALIZADO';

CREATE UNIQUE INDEX "cotizaciones_codigo_legalizacion_key" ON "cotizaciones"("codigo_legalizacion");
