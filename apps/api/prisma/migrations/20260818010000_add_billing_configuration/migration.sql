CREATE TABLE "configuraciones_empresa" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "moneda_base" VARCHAR(3) NOT NULL DEFAULT 'DOP',
    "zona_horaria" TEXT NOT NULL DEFAULT 'America/Santo_Domingo',
    "locale" TEXT NOT NULL DEFAULT 'es-DO',
    "precision_moneda" INTEGER NOT NULL DEFAULT 2,
    "precision_cantidad" INTEGER NOT NULL DEFAULT 4,
    "metodo_redondeo" TEXT NOT NULL DEFAULT 'HALF_UP',
    "redondeo_por" TEXT NOT NULL DEFAULT 'LINEA',
    "precios_incluyen_impuesto" BOOLEAN NOT NULL DEFAULT false,
    "dias_gracia" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuraciones_empresa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "configuraciones_empresa_empresa_id_key" ON "configuraciones_empresa"("empresa_id");

CREATE TABLE "impuestos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tasa" DECIMAL(5,2) NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ITBIS',
    "indicador_facturacion" TEXT NOT NULL DEFAULT '1',
    "incluido_en_precio" BOOLEAN NOT NULL DEFAULT false,
    "vigente_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "impuestos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "impuestos_empresa_id_codigo_key" ON "impuestos"("empresa_id", "codigo");
CREATE INDEX "impuestos_empresa_id_activo_idx" ON "impuestos"("empresa_id", "activo");

CREATE TABLE "terminos_pago" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CONTADO',
    "dias_credito" INTEGER NOT NULL DEFAULT 0,
    "porcentaje_anticipo" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "terminos_pago_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "terminos_pago_empresa_id_codigo_key" ON "terminos_pago"("empresa_id", "codigo");

CREATE TABLE "impuestos_factura" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "detalle_id" TEXT,
    "impuesto_id" TEXT NOT NULL,
    "base_imponible" DECIMAL(12,2) NOT NULL,
    "tasa" DECIMAL(5,2) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "indicador_facturacion" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "impuestos_factura_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "impuestos_factura_factura_id_idx" ON "impuestos_factura"("factura_id");

CREATE TABLE "pagos_clientes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "moneda" VARCHAR(3) NOT NULL DEFAULT 'DOP',
    "monto" DECIMAL(12,2) NOT NULL,
    "tasa_cambio" DECIMAL(18,8) NOT NULL DEFAULT 1,
    "metodo" TEXT NOT NULL,
    "referencia" TEXT,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADO',
    "usuario_id" TEXT NOT NULL,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_clientes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pagos_clientes_empresa_id_cliente_id_fecha_pago_idx" ON "pagos_clientes"("empresa_id", "cliente_id", "fecha_pago");

CREATE TABLE "aplicaciones_pago" (
    "id" TEXT NOT NULL,
    "pago_id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "aplicaciones_pago_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "aplicaciones_pago_pago_id_factura_id_key" ON "aplicaciones_pago"("pago_id", "factura_id");
CREATE INDEX "aplicaciones_pago_factura_id_idx" ON "aplicaciones_pago"("factura_id");

ALTER TABLE "productos" ADD COLUMN "impuesto_id" TEXT;
ALTER TABLE "facturas_venta" ADD COLUMN "moneda" VARCHAR(3) NOT NULL DEFAULT 'DOP';
ALTER TABLE "facturas_venta" ADD COLUMN "tasa_cambio" DECIMAL(18,8) NOT NULL DEFAULT 1;
ALTER TABLE "facturas_venta" ADD COLUMN "moneda_base" VARCHAR(3) NOT NULL DEFAULT 'DOP';
ALTER TABLE "facturas_venta" ADD COLUMN "redondeo_ajuste" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "facturas_venta" ADD COLUMN "termino_pago_id" TEXT;
ALTER TABLE "facturas_venta_detalles" ADD COLUMN "impuesto_id" TEXT;
ALTER TABLE "facturas_venta_detalles" ADD COLUMN "indicador_facturacion" TEXT;

ALTER TABLE "configuraciones_empresa" ADD CONSTRAINT "configuraciones_empresa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "impuestos" ADD CONSTRAINT "impuestos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "terminos_pago" ADD CONSTRAINT "terminos_pago_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "impuestos_factura" ADD CONSTRAINT "impuestos_factura_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "impuestos_factura" ADD CONSTRAINT "impuestos_factura_detalle_id_fkey" FOREIGN KEY ("detalle_id") REFERENCES "facturas_venta_detalles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "impuestos_factura" ADD CONSTRAINT "impuestos_factura_impuesto_id_fkey" FOREIGN KEY ("impuesto_id") REFERENCES "impuestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pagos_clientes" ADD CONSTRAINT "pagos_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "aplicaciones_pago" ADD CONSTRAINT "aplicaciones_pago_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pagos_clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aplicaciones_pago" ADD CONSTRAINT "aplicaciones_pago_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_impuesto_id_fkey" FOREIGN KEY ("impuesto_id") REFERENCES "impuestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "facturas_venta" ADD CONSTRAINT "facturas_venta_termino_pago_id_fkey" FOREIGN KEY ("termino_pago_id") REFERENCES "terminos_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "facturas_venta_detalles" ADD CONSTRAINT "facturas_venta_detalles_impuesto_id_fkey" FOREIGN KEY ("impuesto_id") REFERENCES "impuestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
