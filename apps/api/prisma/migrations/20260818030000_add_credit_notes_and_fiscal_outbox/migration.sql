-- Notas de crédito: relación estructural con la factura y detalle original
ALTER TABLE "facturas_venta" ADD COLUMN "factura_original_id" TEXT;
ALTER TABLE "facturas_venta_detalles" ADD COLUMN "detalle_original_id" TEXT;

-- Outbox fiscal: aislamiento por empresa e idempotencia por documento
ALTER TABLE "outbox_events" ADD COLUMN "empresa_id" TEXT;
CREATE UNIQUE INDEX "outbox_events_tipo_aggregate_id_key" ON "outbox_events"("tipo", "aggregate_id");
CREATE INDEX "outbox_events_empresa_id_idx" ON "outbox_events"("empresa_id");

ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_factura_original_id_fkey" FOREIGN KEY ("factura_original_id") REFERENCES "facturas_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "facturas_venta_detalles" ADD CONSTRAINT "facturas_venta_detalles_detalle_original_id_fkey" FOREIGN KEY ("detalle_original_id") REFERENCES "facturas_venta_detalles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
