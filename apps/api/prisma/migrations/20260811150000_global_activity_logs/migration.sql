ALTER TABLE "activity_logs" ALTER COLUMN "empresa_id" DROP NOT NULL;
CREATE INDEX "activity_logs_creado_en_idx" ON "activity_logs"("creado_en" DESC);
