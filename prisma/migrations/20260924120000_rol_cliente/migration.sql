-- Nuevo rol "cliente".
INSERT INTO "roles" ("nombre") VALUES ('cliente') ON CONFLICT ("nombre") DO NOTHING;

-- Un usuario con rol "cliente" queda asociado a un registro de "clientes".
ALTER TABLE "usuarios" ADD COLUMN "cliente_id" INTEGER;

CREATE INDEX "usuarios_cliente_id_idx" ON "usuarios"("cliente_id");

ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
