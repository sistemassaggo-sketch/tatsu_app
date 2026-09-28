-- CreateTable
CREATE TABLE "apliques" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "apliques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apliques_nombre_key" ON "apliques"("nombre");

-- CreateTable
CREATE TABLE "apliques_familias" (
    "id" SERIAL NOT NULL,
    "aplique_id" INTEGER NOT NULL,
    "familia" VARCHAR(150) NOT NULL,

    CONSTRAINT "apliques_familias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apliques_familias_aplique_id_familia_key" ON "apliques_familias"("aplique_id", "familia");

-- AddForeignKey
ALTER TABLE "apliques_familias" ADD CONSTRAINT "apliques_familias_aplique_id_fkey" FOREIGN KEY ("aplique_id") REFERENCES "apliques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "item_cotizacion" ADD COLUMN "aplique_id" INTEGER;

-- AddForeignKey
ALTER TABLE "item_cotizacion" ADD CONSTRAINT "item_cotizacion_aplique_id_fkey" FOREIGN KEY ("aplique_id") REFERENCES "apliques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
