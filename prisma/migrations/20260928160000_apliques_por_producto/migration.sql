-- DropForeignKey
ALTER TABLE "apliques_familias" DROP CONSTRAINT IF EXISTS "apliques_familias_aplique_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "apliques_familias";

-- CreateEnum
CREATE TYPE "FamiliaAplique" AS ENUM ('ESPEJO', 'MATE', 'TRANSLUCIDA');

-- AlterTable
ALTER TABLE "apliques" ADD COLUMN "familias" "FamiliaAplique"[] NOT NULL DEFAULT ARRAY[]::"FamiliaAplique"[];

-- CreateTable
CREATE TABLE "productos_apliques" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "aplique_id" INTEGER NOT NULL,

    CONSTRAINT "productos_apliques_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_apliques_producto_id_aplique_id_key" ON "productos_apliques"("producto_id", "aplique_id");

-- AddForeignKey
ALTER TABLE "productos_apliques" ADD CONSTRAINT "productos_apliques_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_apliques" ADD CONSTRAINT "productos_apliques_aplique_id_fkey" FOREIGN KEY ("aplique_id") REFERENCES "apliques"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
