CREATE TABLE "fiscalbridge_webhook_events" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "evento_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "document_uuid" TEXT,
    "raw_body" TEXT NOT NULL,
    "recibido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fiscalbridge_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fiscalbridge_webhook_events_empresa_id_evento_id_key" ON "fiscalbridge_webhook_events"("empresa_id", "evento_id");
CREATE INDEX "fiscalbridge_webhook_events_empresa_id_document_uuid_idx" ON "fiscalbridge_webhook_events"("empresa_id", "document_uuid");

ALTER TABLE "fiscalbridge_webhook_events" ADD CONSTRAINT "fiscalbridge_webhook_events_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
