CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "empresa_id" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'USER',
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "icono" TEXT,
    "severidad" TEXT NOT NULL DEFAULT 'INFO',
    "payload" TEXT,
    "leida_en" TIMESTAMP(3),
    "archivada_en" TIMESTAMP(3),
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDING',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "provider_message_id" TEXT,
    "ultimo_error" TEXT,
    "proximo_intento_en" TIMESTAMP(3),
    "enviada_en" TIMESTAMP(3),
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "aggregate_id" TEXT,
    "payload" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDING',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximo_intento_en" TIMESTAMP(3),
    "procesado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_deliveries_notification_id_canal_key" ON "notification_deliveries"("notification_id", "canal");
CREATE UNIQUE INDEX "notification_preferences_usuario_id_tipo_canal_key" ON "notification_preferences"("usuario_id", "tipo", "canal");
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "notifications_usuario_id_leida_en_creada_en_idx" ON "notifications"("usuario_id", "leida_en", "creada_en");
CREATE INDEX "notifications_empresa_id_leida_en_creada_en_idx" ON "notifications"("empresa_id", "leida_en", "creada_en");
CREATE INDEX "notification_deliveries_estado_proximo_intento_en_idx" ON "notification_deliveries"("estado", "proximo_intento_en");
CREATE INDEX "push_subscriptions_usuario_id_idx" ON "push_subscriptions"("usuario_id");
CREATE INDEX "outbox_events_estado_proximo_intento_en_creado_en_idx" ON "outbox_events"("estado", "proximo_intento_en", "creado_en");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
