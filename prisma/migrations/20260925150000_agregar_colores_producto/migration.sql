-- CreateTable
CREATE TABLE "colores" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "hex" VARCHAR(7) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "colores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colores_nombre_key" ON "colores"("nombre");

-- CreateTable
CREATE TABLE "productos_colores" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "existencias" INTEGER NOT NULL DEFAULT 0,
    "disponibilidad" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "productos_colores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_colores_producto_id_color_id_key" ON "productos_colores"("producto_id", "color_id");

-- AddForeignKey
ALTER TABLE "productos_colores" ADD CONSTRAINT "productos_colores_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_colores" ADD CONSTRAINT "productos_colores_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "item_cotizacion" ADD COLUMN "color_id" INTEGER;

-- AddForeignKey
ALTER TABLE "item_cotizacion" ADD CONSTRAINT "item_cotizacion_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "colores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
