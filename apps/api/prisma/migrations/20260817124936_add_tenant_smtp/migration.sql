/*
  Warnings:

  - You are about to alter the column `monto` on the `facturas` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `precio_mensual` on the `planes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `precio_anual` on the `planes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `precio_venta` on the `productos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `costo` on the `productos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to alter the column `tax_rate` on the `productos` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "fiscalbridge_auth_method" TEXT DEFAULT 'TOKEN',
ADD COLUMN     "fiscalbridge_client_id" TEXT,
ADD COLUMN     "fiscalbridge_client_secret" TEXT,
ADD COLUMN     "fiscalbridge_email" TEXT,
ADD COLUMN     "fiscalbridge_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fiscalbridge_env" TEXT DEFAULT 'TEST',
ADD COLUMN     "fiscalbridge_password" TEXT,
ADD COLUMN     "fiscalbridge_token" TEXT,
ADD COLUMN     "fiscalbridge_url" TEXT,
ADD COLUMN     "fiscalbridge_webhook_secret" TEXT,
ADD COLUMN     "smtp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtp_from" TEXT,
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_pass" TEXT,
ADD COLUMN     "smtp_port" INTEGER DEFAULT 587,
ADD COLUMN     "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtp_user" TEXT;

-- AlterTable
ALTER TABLE "facturas" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "planes" ALTER COLUMN "precio_mensual" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "precio_anual" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "precio_venta" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "costo" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "tax_rate" SET DATA TYPE DECIMAL(5,2);

-- CreateTable
CREATE TABLE "almacenes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'VENTA',
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_stocks" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "almacen_id" TEXT NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stock_minimo" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "stock_maximo" DECIMAL(14,4),
    "costo_promedio" DECIMAL(12,2),
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "almacen_origen_id" TEXT,
    "almacen_destino_id" TEXT,
    "usuario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" DECIMAL(14,4) NOT NULL,
    "costo_unitario" DECIMAL(12,2),
    "referencia_doc" TEXT,
    "motivo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secuencias_ncf" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prefijo" TEXT NOT NULL,
    "numero_actual" INTEGER NOT NULL DEFAULT 1,
    "numero_hasta" INTEGER NOT NULL DEFAULT 99999999,
    "fecha_vencimiento" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "ambiente" TEXT NOT NULL DEFAULT 'TEST',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secuencias_ncf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas_venta" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT,
    "almacen_id" TEXT,
    "cliente_id" TEXT,
    "usuario_id" TEXT,
    "numero_factura" TEXT NOT NULL,
    "ncf" TEXT,
    "tipo_ncf" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_vencimiento" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'EMITIDA',
    "tipo_pago" TEXT NOT NULL DEFAULT 'CONTADO',
    "metodo_pago" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "itbis" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "monto_pagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_pendiente" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fiscalbridge_status" TEXT DEFAULT 'NOT_TRANSMITTED',
    "fiscalbridge_doc_id" TEXT,
    "fiscalbridge_track_id" TEXT,
    "fiscalbridge_error" TEXT,
    "fiscalbridge_qr_url" TEXT,
    "fiscalbridge_security_code" TEXT,
    "fiscalbridge_sign_date" TIMESTAMP(3),
    "ncf_modificado" TEXT,
    "motivo_modificacion" TEXT,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturas_venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas_venta_detalles" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "tasa_itbis" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "itbis" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_venta_detalles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "almacenes_empresa_id_nombre_key" ON "almacenes"("empresa_id", "nombre");

-- CreateIndex
CREATE INDEX "inventario_stocks_empresa_id_almacen_id_idx" ON "inventario_stocks"("empresa_id", "almacen_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_stocks_producto_id_almacen_id_key" ON "inventario_stocks"("producto_id", "almacen_id");

-- CreateIndex
CREATE INDEX "movimientos_inventario_empresa_id_producto_id_creado_en_idx" ON "movimientos_inventario"("empresa_id", "producto_id", "creado_en");

-- CreateIndex
CREATE INDEX "secuencias_ncf_empresa_id_activa_idx" ON "secuencias_ncf"("empresa_id", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "secuencias_ncf_empresa_id_prefijo_ambiente_key" ON "secuencias_ncf"("empresa_id", "prefijo", "ambiente");

-- CreateIndex
CREATE INDEX "facturas_venta_empresa_id_ncf_idx" ON "facturas_venta"("empresa_id", "ncf");

-- CreateIndex
CREATE INDEX "facturas_venta_empresa_id_fecha_idx" ON "facturas_venta"("empresa_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "facturas_venta_empresa_id_estado_idx" ON "facturas_venta"("empresa_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_venta_empresa_id_numero_factura_key" ON "facturas_venta"("empresa_id", "numero_factura");

-- CreateIndex
CREATE INDEX "facturas_venta_detalles_factura_id_idx" ON "facturas_venta_detalles"("factura_id");

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_stocks" ADD CONSTRAINT "inventario_stocks_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_stocks" ADD CONSTRAINT "inventario_stocks_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_stocks" ADD CONSTRAINT "inventario_stocks_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secuencias_ncf" ADD CONSTRAINT "secuencias_ncf_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta_detalles" ADD CONSTRAINT "facturas_venta_detalles_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_venta_detalles" ADD CONSTRAINT "facturas_venta_detalles_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
