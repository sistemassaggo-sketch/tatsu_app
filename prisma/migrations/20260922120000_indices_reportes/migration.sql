-- Índices para las consultas del módulo de reportes (legalizaciones por mes y productos más vendidos).
CREATE INDEX "cotizaciones_estado_fecha_creacion_idx" ON "cotizaciones"("estado", "fecha_creacion");

CREATE INDEX "item_cotizacion_cotizacion_id_idx" ON "item_cotizacion"("cotizacion_id");

CREATE INDEX "item_cotizacion_producto_id_idx" ON "item_cotizacion"("producto_id");
