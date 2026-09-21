-- usuarios.vendedor pasa a llamarse nombre
ALTER TABLE "usuarios" RENAME COLUMN "vendedor" TO "nombre";

-- cotizaciones.vendedor pasa de texto a llave foránea hacia usuarios.id
ALTER TABLE "cotizaciones" RENAME COLUMN "vendedor" TO "vendedor_texto";
ALTER TABLE "cotizaciones" ADD COLUMN "vendedor" INTEGER;

UPDATE "cotizaciones" c
SET "vendedor" = COALESCE(
  (SELECT u."id" FROM "usuarios" u WHERE u."username" = c."vendedor_texto" LIMIT 1),
  (SELECT u."id" FROM "usuarios" u WHERE u."nombre" = c."vendedor_texto" ORDER BY u."id" LIMIT 1)
)
WHERE c."vendedor_texto" IS NOT NULL;

ALTER TABLE "cotizaciones" DROP COLUMN "vendedor_texto";

ALTER TABLE "cotizaciones"
  ADD CONSTRAINT "cotizaciones_vendedor_fkey" FOREIGN KEY ("vendedor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
