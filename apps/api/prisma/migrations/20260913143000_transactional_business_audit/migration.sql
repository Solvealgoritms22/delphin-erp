-- Minimal durable evidence; application logs supplement this with actor and human context.
CREATE FUNCTION audit_business_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb; previous_data jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := to_jsonb(OLD); ELSE row_data := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN previous_data := to_jsonb(OLD); END IF;
  INSERT INTO activity_logs (id, empresa_id, modulo, accion, resource_id, resource_type, metadata, creado_en)
  VALUES (gen_random_uuid()::text, row_data->>'empresa_id', TG_ARGV[0], 'DB_' || TG_OP, row_data->>'id', TG_TABLE_NAME,
    jsonb_build_object('source', 'transactional_trigger', 'previousState', previous_data->>'estado', 'state', row_data->>'estado')::text, CURRENT_TIMESTAMP);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER invoices_durable_audit AFTER INSERT OR UPDATE OR DELETE ON facturas_venta FOR EACH ROW EXECUTE FUNCTION audit_business_change('invoices');
CREATE TRIGGER purchases_durable_audit AFTER INSERT OR UPDATE OR DELETE ON facturas_compra FOR EACH ROW EXECUTE FUNCTION audit_business_change('purchases');
CREATE TRIGGER receipts_durable_audit AFTER INSERT OR UPDATE OR DELETE ON pagos_clientes FOR EACH ROW EXECUTE FUNCTION audit_business_change('customer-payments');
CREATE TRIGGER subscriptions_durable_audit AFTER INSERT OR UPDATE OR DELETE ON suscripciones FOR EACH ROW EXECUTE FUNCTION audit_business_change('SECURITY');
