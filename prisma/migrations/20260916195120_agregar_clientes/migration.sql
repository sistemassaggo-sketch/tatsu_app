-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "persona_contacto" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "ciudad" VARCHAR(100) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_nombre_key" ON "clientes"("nombre");
