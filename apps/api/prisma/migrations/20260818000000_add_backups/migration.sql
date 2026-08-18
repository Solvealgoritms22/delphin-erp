CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "propietario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL DEFAULT 'LOCAL',
    "estado" TEXT NOT NULL DEFAULT 'PENDING',
    "formato" TEXT NOT NULL DEFAULT 'DOLPHIN_JSON_GZIP_AES256',
    "nombre_archivo" TEXT NOT NULL,
    "storage_key" TEXT,
    "external_file_id" TEXT,
    "tamano_bytes" BIGINT,
    "sha256" TEXT,
    "error" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_en" TIMESTAMP(3),
    "completado_en" TIMESTAMP(3),
    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_drive_connections" (
    "id" TEXT NOT NULL,
    "propietario_id" TEXT NOT NULL,
    "google_email" TEXT,
    "refresh_token" TEXT NOT NULL,
    "folder_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVE',
    "ultimo_error" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "google_drive_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_drive_connections_propietario_id_key" ON "google_drive_connections"("propietario_id");
CREATE INDEX "backups_propietario_id_creado_en_idx" ON "backups"("propietario_id", "creado_en" DESC);
CREATE INDEX "backups_empresa_id_creado_en_idx" ON "backups"("empresa_id", "creado_en" DESC);
CREATE INDEX "backups_estado_idx" ON "backups"("estado");

ALTER TABLE "backups" ADD CONSTRAINT "backups_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "backups" ADD CONSTRAINT "backups_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_drive_connections" ADD CONSTRAINT "google_drive_connections_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "inventario_stocks_empresa_id_producto_id_almacen_id_key" ON "inventario_stocks"("empresa_id", "producto_id", "almacen_id");
