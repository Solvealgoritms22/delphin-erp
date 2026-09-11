-- Historical values must not be inferred from mutable sequence configuration.
ALTER TABLE "facturas_venta" ADD COLUMN "fecha_vencimiento_ncf" TIMESTAMP(3);
