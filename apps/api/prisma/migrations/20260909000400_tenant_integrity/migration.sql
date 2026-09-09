-- Composite foreign keys enforce tenant integrity independently of the API.
-- Existing inconsistent rows deliberately block deployment instead of being deleted.
DO $$
DECLARE r record; constraint_name text;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS child, c.confrelid::regclass AS parent,
           a.attname AS fk_column, c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    JOIN pg_attribute p ON p.attrelid=c.confrelid AND p.attnum=c.confkey[1]
    WHERE c.contype='f' AND array_length(c.conkey,1)=1 AND p.attname='id'
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=c.conrelid AND attname='empresa_id' AND NOT attisdropped)
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=c.confrelid AND attname='empresa_id' AND NOT attisdropped)
  LOOP
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %s (empresa_id,id)', 'tenant_identity_' || r.parent::oid, r.parent);
    constraint_name := 'tenant_fk_' || md5(r.conname || r.child::text);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (empresa_id,%I) REFERENCES %s(empresa_id,id) DEFERRABLE INITIALLY DEFERRED', r.child, constraint_name, r.fk_column, r.parent);
  END LOOP;
END $$;

-- Operational audit records are append-only, including direct SQL access.
CREATE FUNCTION dolphin_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit records are append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER activity_logs_append_only BEFORE UPDATE OR DELETE ON activity_logs
FOR EACH ROW EXECUTE FUNCTION dolphin_audit_append_only();

-- Common invariants are enforced for existing and future writers.
ALTER TABLE empresas ADD CONSTRAINT empresa_estado_valid CHECK (estado IN ('ACTIVA','INACTIVA','ARCHIVADA'));
ALTER TABLE membresias ADD CONSTRAINT membresia_estado_valid CHECK (estado IN ('ACTIVO','INACTIVO','PENDIENTE'));
ALTER TABLE inventario_stocks ADD CONSTRAINT stock_no_negativo CHECK (cantidad >= 0);
ALTER TABLE productos_insumos ADD CONSTRAINT insumo_cantidad_positiva CHECK (cantidad > 0 AND producto_padre_id <> insumo_producto_id);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX productos_nombre_trgm_idx ON productos USING gin(nombre gin_trgm_ops);
CREATE INDEX productos_codigo_trgm_idx ON productos USING gin(codigo gin_trgm_ops);
CREATE INDEX productos_empresa_creado_idx ON productos(empresa_id,creado_en DESC);
