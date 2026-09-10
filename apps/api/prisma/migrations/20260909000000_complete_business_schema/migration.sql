-- Reconcile business models previously added without migrations.
-- Additive: preserves existing rows and supports databases previously using db push.
BEGIN;
-- AlterTable
ALTER TABLE "categorias" ADD COLUMN IF NOT EXISTS "color" TEXT,
ADD COLUMN IF NOT EXISTS "icono" TEXT,
ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'AMBOS';

-- AlterTable
ALTER TABLE "configuraciones_empresa" ADD COLUMN IF NOT EXISTS "backup_auto_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "backup_destino" TEXT NOT NULL DEFAULT 'LOCAL',
ADD COLUMN IF NOT EXISTS "backup_frecuencia" TEXT NOT NULL DEFAULT 'DAILY',
ADD COLUMN IF NOT EXISTS "backup_hora" TEXT NOT NULL DEFAULT '02:00',
ADD COLUMN IF NOT EXISTS "backup_retencion_dias" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS "tasas_cambio" JSONB,
ADD COLUMN IF NOT EXISTS "ultimo_backup_auto" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "direccion" TEXT;

-- AlterTable
ALTER TABLE "facturas_venta_detalles" ADD COLUMN IF NOT EXISTS "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "porcentaje_descuento" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "precio_lista" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "promocion_id" TEXT,
ADD COLUMN IF NOT EXISTS "promocion_nombre" TEXT;

-- AlterTable
ALTER TABLE "marcas" ADD COLUMN IF NOT EXISTS "descripcion" TEXT;

-- AlterTable
ALTER TABLE "pagos_clientes" ADD COLUMN IF NOT EXISTS "numero_recibo" TEXT;

-- AlterTable
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "descuento_maximo" DECIMAL(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS "descuento_porcentaje" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "en_oferta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "moneda" VARCHAR(3) NOT NULL DEFAULT 'DOP',
ADD COLUMN IF NOT EXISTS "oferta_desde" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "oferta_hasta" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "precio_oferta" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "unidades_medida" ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT 'PRODUCTO';


-- CreateTable
CREATE TABLE IF NOT EXISTS "productos_insumos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "producto_padre_id" TEXT NOT NULL,
    "insumo_producto_id" TEXT NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "costo_unitario" DECIMAL(12,2),
    "unidad_medida_id" TEXT,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_conversaciones" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Nueva conversación',
    "empresa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_mensajes" (
    "id" TEXT NOT NULL,
    "conversacion_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tools_used" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_api_apps" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "api_key_hash" TEXT NOT NULL,
    "api_key_prefix" TEXT NOT NULL,
    "allowed_origins" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "last_used_at" TIMESTAMP(3),
    "request_count" BIGINT NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_api_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promociones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "codigo_cupon" TEXT,
    "tipo_descuento" TEXT NOT NULL DEFAULT 'PORCENTAJE',
    "valor_descuento" DECIMAL(12,2) NOT NULL,
    "alcance" TEXT NOT NULL DEFAULT 'PRODUCTOS',
    "categoria_id" TEXT,
    "marca_id" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "cantidad_minima" DECIMAL(12,2) DEFAULT 1,
    "monto_minimo" DECIMAL(12,2) DEFAULT 0,
    "limite_usos" INTEGER,
    "usos_actuales" INTEGER NOT NULL DEFAULT 0,
    "es_acumulable" BOOLEAN NOT NULL DEFAULT false,
    "prioridad" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "promociones_productos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "promocion_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promociones_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "facturas_compra" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "almacen_id" TEXT,
    "proveedor_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "numero_factura" TEXT NOT NULL,
    "ncf" TEXT,
    "ncf_modificado" TEXT,
    "tipo_ncf" TEXT,
    "tipo_gasto" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADA',
    "tipo_pago" TEXT NOT NULL DEFAULT 'CONTADO',
    "metodo_pago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itbis_retenido" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retencion_renta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "monto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_pendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'DOP',
    "tasa_cambio" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturas_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "facturas_compra_detalles" (
    "id" TEXT NOT NULL,
    "factura_compra_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "costo_unitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tasa_itbis" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "afecta_inventario" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "facturas_compra_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pagos_proveedores" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "proveedor_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'DOP',
    "monto" DECIMAL(12,2) NOT NULL,
    "tasa_cambio" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADO',
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "aplicaciones_pago_proveedor" (
    "id" TEXT NOT NULL,
    "pago_id" TEXT NOT NULL,
    "factura_compra_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aplicaciones_pago_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cotizaciones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "almacen_id" TEXT,
    "cliente_id" TEXT,
    "usuario_id" TEXT,
    "factura_id" TEXT,
    "numero_cotizacion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'DOP',
    "tasa_cambio" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "notas" TEXT,
    "terminos_condiciones" TEXT,
    "enviada_por_email" BOOLEAN NOT NULL DEFAULT false,
    "fecha_envio_email" TIMESTAMP(3),
    "email_destino" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cotizaciones_detalles" (
    "id" TEXT NOT NULL,
    "cotizacion_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "porcentaje_descuento" DECIMAL(5,2) DEFAULT 0,
    "tasa_itbis" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "itbis" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotizaciones_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "productos_insumos_empresa_id_idx" ON "productos_insumos"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "productos_insumos_producto_padre_id_insumo_producto_id_key" ON "productos_insumos"("producto_padre_id", "insumo_producto_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_conversaciones_empresa_id_usuario_id_idx" ON "ai_conversaciones"("empresa_id", "usuario_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ai_mensajes_conversacion_id_idx" ON "ai_mensajes"("conversacion_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_api_apps_api_key_hash_key" ON "tenant_api_apps"("api_key_hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_api_apps_empresa_id_estado_idx" ON "tenant_api_apps"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promociones_empresa_id_estado_fecha_inicio_fecha_fin_idx" ON "promociones"("empresa_id", "estado", "fecha_inicio", "fecha_fin");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promociones_empresa_id_codigo_cupon_key" ON "promociones"("empresa_id", "codigo_cupon");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "promociones_productos_empresa_id_producto_id_idx" ON "promociones_productos"("empresa_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "promociones_productos_promocion_id_producto_id_key" ON "promociones_productos"("promocion_id", "producto_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "facturas_compra_empresa_id_proveedor_id_fecha_idx" ON "facturas_compra"("empresa_id", "proveedor_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "facturas_compra_empresa_id_estado_idx" ON "facturas_compra"("empresa_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "facturas_compra_empresa_id_numero_factura_key" ON "facturas_compra"("empresa_id", "numero_factura");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "facturas_compra_detalles_factura_compra_id_idx" ON "facturas_compra_detalles"("factura_compra_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagos_proveedores_empresa_id_proveedor_id_fecha_pago_idx" ON "pagos_proveedores"("empresa_id", "proveedor_id", "fecha_pago");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "aplicaciones_pago_proveedor_factura_compra_id_idx" ON "aplicaciones_pago_proveedor"("factura_compra_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "aplicaciones_pago_proveedor_pago_id_factura_compra_id_key" ON "aplicaciones_pago_proveedor"("pago_id", "factura_compra_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cotizaciones_empresa_id_cliente_id_fecha_idx" ON "cotizaciones"("empresa_id", "cliente_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cotizaciones_empresa_id_estado_idx" ON "cotizaciones"("empresa_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cotizaciones_empresa_id_numero_cotizacion_key" ON "cotizaciones"("empresa_id", "numero_cotizacion");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cotizaciones_detalles_cotizacion_id_idx" ON "cotizaciones_detalles"("cotizacion_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pagos_clientes_empresa_id_numero_recibo_idx" ON "pagos_clientes"("empresa_id", "numero_recibo");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='productos_insumos'::regclass AND conname='productos_insumos_empresa_id_fkey') THEN
    ALTER TABLE "productos_insumos" ADD CONSTRAINT "productos_insumos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='productos_insumos'::regclass AND conname='productos_insumos_producto_padre_id_fkey') THEN
    ALTER TABLE "productos_insumos" ADD CONSTRAINT "productos_insumos_producto_padre_id_fkey" FOREIGN KEY ("producto_padre_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='productos_insumos'::regclass AND conname='productos_insumos_insumo_producto_id_fkey') THEN
    ALTER TABLE "productos_insumos" ADD CONSTRAINT "productos_insumos_insumo_producto_id_fkey" FOREIGN KEY ("insumo_producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='productos_insumos'::regclass AND conname='productos_insumos_unidad_medida_id_fkey') THEN
    ALTER TABLE "productos_insumos" ADD CONSTRAINT "productos_insumos_unidad_medida_id_fkey" FOREIGN KEY ("unidad_medida_id") REFERENCES "unidades_medida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_venta_detalles'::regclass AND conname='facturas_venta_detalles_promocion_id_fkey') THEN
    ALTER TABLE "facturas_venta_detalles" ADD CONSTRAINT "facturas_venta_detalles_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pagos_clientes'::regclass AND conname='pagos_clientes_usuario_id_fkey') THEN
    ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ai_conversaciones'::regclass AND conname='ai_conversaciones_empresa_id_fkey') THEN
    ALTER TABLE "ai_conversaciones" ADD CONSTRAINT "ai_conversaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ai_conversaciones'::regclass AND conname='ai_conversaciones_usuario_id_fkey') THEN
    ALTER TABLE "ai_conversaciones" ADD CONSTRAINT "ai_conversaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='ai_mensajes'::regclass AND conname='ai_mensajes_conversacion_id_fkey') THEN
    ALTER TABLE "ai_mensajes" ADD CONSTRAINT "ai_mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "ai_conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='tenant_api_apps'::regclass AND conname='tenant_api_apps_empresa_id_fkey') THEN
    ALTER TABLE "tenant_api_apps" ADD CONSTRAINT "tenant_api_apps_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='promociones'::regclass AND conname='promociones_empresa_id_fkey') THEN
    ALTER TABLE "promociones" ADD CONSTRAINT "promociones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='promociones'::regclass AND conname='promociones_categoria_id_fkey') THEN
    ALTER TABLE "promociones" ADD CONSTRAINT "promociones_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='promociones'::regclass AND conname='promociones_marca_id_fkey') THEN
    ALTER TABLE "promociones" ADD CONSTRAINT "promociones_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='promociones_productos'::regclass AND conname='promociones_productos_empresa_id_fkey') THEN
    ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='promociones_productos'::regclass AND conname='promociones_productos_promocion_id_fkey') THEN
    ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_promocion_id_fkey" FOREIGN KEY ("promocion_id") REFERENCES "promociones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='promociones_productos'::regclass AND conname='promociones_productos_producto_id_fkey') THEN
    ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra'::regclass AND conname='facturas_compra_empresa_id_fkey') THEN
    ALTER TABLE "facturas_compra" ADD CONSTRAINT "facturas_compra_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra'::regclass AND conname='facturas_compra_sucursal_id_fkey') THEN
    ALTER TABLE "facturas_compra" ADD CONSTRAINT "facturas_compra_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra'::regclass AND conname='facturas_compra_almacen_id_fkey') THEN
    ALTER TABLE "facturas_compra" ADD CONSTRAINT "facturas_compra_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra'::regclass AND conname='facturas_compra_proveedor_id_fkey') THEN
    ALTER TABLE "facturas_compra" ADD CONSTRAINT "facturas_compra_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra'::regclass AND conname='facturas_compra_usuario_id_fkey') THEN
    ALTER TABLE "facturas_compra" ADD CONSTRAINT "facturas_compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra_detalles'::regclass AND conname='facturas_compra_detalles_factura_compra_id_fkey') THEN
    ALTER TABLE "facturas_compra_detalles" ADD CONSTRAINT "facturas_compra_detalles_factura_compra_id_fkey" FOREIGN KEY ("factura_compra_id") REFERENCES "facturas_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='facturas_compra_detalles'::regclass AND conname='facturas_compra_detalles_producto_id_fkey') THEN
    ALTER TABLE "facturas_compra_detalles" ADD CONSTRAINT "facturas_compra_detalles_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pagos_proveedores'::regclass AND conname='pagos_proveedores_empresa_id_fkey') THEN
    ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pagos_proveedores'::regclass AND conname='pagos_proveedores_proveedor_id_fkey') THEN
    ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pagos_proveedores'::regclass AND conname='pagos_proveedores_usuario_id_fkey') THEN
    ALTER TABLE "pagos_proveedores" ADD CONSTRAINT "pagos_proveedores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='aplicaciones_pago_proveedor'::regclass AND conname='aplicaciones_pago_proveedor_pago_id_fkey') THEN
    ALTER TABLE "aplicaciones_pago_proveedor" ADD CONSTRAINT "aplicaciones_pago_proveedor_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos_proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='aplicaciones_pago_proveedor'::regclass AND conname='aplicaciones_pago_proveedor_factura_compra_id_fkey') THEN
    ALTER TABLE "aplicaciones_pago_proveedor" ADD CONSTRAINT "aplicaciones_pago_proveedor_factura_compra_id_fkey" FOREIGN KEY ("factura_compra_id") REFERENCES "facturas_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones'::regclass AND conname='cotizaciones_empresa_id_fkey') THEN
    ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones'::regclass AND conname='cotizaciones_sucursal_id_fkey') THEN
    ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones'::regclass AND conname='cotizaciones_almacen_id_fkey') THEN
    ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones'::regclass AND conname='cotizaciones_cliente_id_fkey') THEN
    ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones'::regclass AND conname='cotizaciones_usuario_id_fkey') THEN
    ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones'::regclass AND conname='cotizaciones_factura_id_fkey') THEN
    ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones_detalles'::regclass AND conname='cotizaciones_detalles_cotizacion_id_fkey') THEN
    ALTER TABLE "cotizaciones_detalles" ADD CONSTRAINT "cotizaciones_detalles_cotizacion_id_fkey" FOREIGN KEY ("cotizacion_id") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='cotizaciones_detalles'::regclass AND conname='cotizaciones_detalles_producto_id_fkey') THEN
    ALTER TABLE "cotizaciones_detalles" ADD CONSTRAINT "cotizaciones_detalles_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


COMMIT;
