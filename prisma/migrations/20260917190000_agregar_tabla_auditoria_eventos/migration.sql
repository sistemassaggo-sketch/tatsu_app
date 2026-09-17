-- CreateTable
CREATE TABLE "auditoria_eventos" (
    "id" SERIAL NOT NULL,
    "usuario" VARCHAR(100) NOT NULL,
    "usuario_id" INTEGER,
    "accion" VARCHAR(100) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ip" VARCHAR(50),
    "recurso" VARCHAR(80) NOT NULL,
    "recurso_id" INTEGER,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_eventos_pkey" PRIMARY KEY ("id")
);
