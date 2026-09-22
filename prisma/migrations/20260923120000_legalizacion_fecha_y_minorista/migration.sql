ALTER TABLE "cotizaciones" ADD COLUMN "fecha_legalizacion" TIMESTAMP(3);
ALTER TABLE "cotizaciones" ADD COLUMN "es_minorista" BOOLEAN NOT NULL DEFAULT false;
