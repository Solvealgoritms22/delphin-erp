CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "rnc" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "pagina_web" TEXT,
    "descripcion" TEXT,
    "redes_sociales" TEXT,
    "logo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propietario_id" TEXT,
    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "ciudad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT,
    "avatar" TEXT,
    "mfa_habilitado" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_acceso" TIMESTAMP(3),
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membresias" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "role_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT "membresias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "permissions" TEXT,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "unidades_medida" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "abreviatura" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    CONSTRAINT "unidades_medida_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PRODUCTO',
    "codigo" TEXT NOT NULL,
    "codigo_barras" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_venta" DOUBLE PRECISION NOT NULL,
    "costo" DOUBLE PRECISION,
    "tax_rate" DOUBLE PRECISION DEFAULT 0,
    "imagenes" TEXT,
    "tags" TEXT,
    "categoria_id" TEXT,
    "marca_id" TEXT,
    "unidad_medida_id" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo_documento" TEXT NOT NULL DEFAULT 'RUT',
    "numero_documento" TEXT NOT NULL,
    "nombre_razon_social" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo_documento" TEXT NOT NULL DEFAULT 'RUT',
    "numero_documento" TEXT NOT NULL,
    "nombre_razon_social" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_mensual" DOUBLE PRECISION NOT NULL,
    "precio_anual" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "max_usuarios" INTEGER NOT NULL DEFAULT 1,
    "max_sucursales" INTEGER NOT NULL DEFAULT 1,
    "max_productos" INTEGER NOT NULL DEFAULT 100,
    "caracteristicas" TEXT,
    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVE',
    "periodicidad" TEXT NOT NULL DEFAULT 'MONTHLY',
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_renovacion" TIMESTAMP(3),
    "fecha_cancelacion" TIMESTAMP(3),
    "azul_data_vault_token" TEXT,
    "azul_data_vault_expiration" TEXT,
    "azul_card_last4" TEXT,
    "azul_card_brand" TEXT,
    "azul_card_holder" TEXT,
    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "suscripcion_id" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "estado" TEXT NOT NULL DEFAULT 'PAID',
    "azul_order_id" TEXT,
    "azul_auth_code" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "usuario_nombre" TEXT,
    "usuario_email" TEXT,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "resource_id" TEXT,
    "resource_name" TEXT,
    "resource_type" TEXT,
    "metadata" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "empresas_rnc_key" ON "empresas"("rnc");
CREATE UNIQUE INDEX "sucursales_empresa_id_nombre_key" ON "sucursales"("empresa_id", "nombre");
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "membresias_usuario_id_empresa_id_key" ON "membresias"("usuario_id", "empresa_id");
CREATE UNIQUE INDEX "roles_empresa_id_nombre_key" ON "roles"("empresa_id", "nombre");
CREATE UNIQUE INDEX "categorias_empresa_id_nombre_key" ON "categorias"("empresa_id", "nombre");
CREATE UNIQUE INDEX "marcas_empresa_id_nombre_key" ON "marcas"("empresa_id", "nombre");
CREATE UNIQUE INDEX "unidades_medida_empresa_id_nombre_key" ON "unidades_medida"("empresa_id", "nombre");
CREATE UNIQUE INDEX "productos_empresa_id_codigo_key" ON "productos"("empresa_id", "codigo");
CREATE UNIQUE INDEX "clientes_empresa_id_numero_documento_key" ON "clientes"("empresa_id", "numero_documento");
CREATE UNIQUE INDEX "proveedores_empresa_id_numero_documento_key" ON "proveedores"("empresa_id", "numero_documento");
CREATE UNIQUE INDEX "suscripciones_empresa_id_key" ON "suscripciones"("empresa_id");
CREATE INDEX "activity_logs_empresa_id_creado_en_idx" ON "activity_logs"("empresa_id", "creado_en" DESC);
CREATE INDEX "activity_logs_empresa_id_modulo_idx" ON "activity_logs"("empresa_id", "modulo");
CREATE INDEX "activity_logs_empresa_id_usuario_id_idx" ON "activity_logs"("empresa_id", "usuario_id");

ALTER TABLE "empresas" ADD CONSTRAINT "empresas_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marcas" ADD CONSTRAINT "marcas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidades_medida_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidades_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
