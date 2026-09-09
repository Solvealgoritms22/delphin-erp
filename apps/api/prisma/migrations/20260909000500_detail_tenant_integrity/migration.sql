-- Detail rows inherit tenancy from their document/payment/conversation.
CREATE FUNCTION dolphin_row_tenant(target_table text, resource_id text) RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE row_data jsonb;
BEGIN
  IF resource_id IS NULL THEN RETURN NULL; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM %I t WHERE id=$1', target_table) INTO row_data USING resource_id;
  IF row_data IS NULL THEN RETURN NULL; END IF;
  IF row_data ? 'empresa_id' THEN RETURN row_data->>'empresa_id'; END IF;
  CASE target_table
    WHEN 'facturas_venta_detalles' THEN RETURN dolphin_row_tenant('facturas_venta', row_data->>'factura_id');
    WHEN 'facturas_compra_detalles' THEN RETURN dolphin_row_tenant('facturas_compra', row_data->>'factura_compra_id');
    WHEN 'cotizaciones_detalles' THEN RETURN dolphin_row_tenant('cotizaciones', row_data->>'cotizacion_id');
    WHEN 'impuestos_factura' THEN RETURN dolphin_row_tenant('facturas_venta', row_data->>'factura_id');
    WHEN 'aplicaciones_pago' THEN RETURN dolphin_row_tenant('pagos_clientes', row_data->>'pago_id');
    WHEN 'aplicaciones_pago_proveedor' THEN RETURN dolphin_row_tenant('pagos_proveedores', row_data->>'pago_id');
    WHEN 'ai_mensajes' THEN RETURN dolphin_row_tenant('ai_conversaciones', row_data->>'conversacion_id');
    WHEN 'notification_deliveries' THEN RETURN dolphin_row_tenant('notifications', row_data->>'notification_id');
    WHEN 'facturas' THEN RETURN dolphin_row_tenant('suscripciones', row_data->>'suscripcion_id');
    ELSE RETURN NULL;
  END CASE;
END $$;

CREATE FUNCTION dolphin_assert_tenant_relations() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE row_data jsonb := to_jsonb(NEW); tenant text := row_data->>'empresa_id'; other_tenant text; i integer;
BEGIN
  IF TG_OP='UPDATE' AND to_jsonb(OLD)->>'empresa_id' IS DISTINCT FROM row_data->>'empresa_id' THEN
    RAISE EXCEPTION 'Tenant ownership is immutable' USING ERRCODE='23514';
  END IF;
  i := 0;
  WHILE i < TG_NARGS LOOP
    other_tenant := dolphin_row_tenant(TG_ARGV[i+1], row_data->>TG_ARGV[i]);
    IF tenant IS NULL THEN tenant := other_tenant;
    ELSIF other_tenant IS NOT NULL AND tenant <> other_tenant THEN
      RAISE EXCEPTION 'Cross-tenant relation in %', TG_TABLE_NAME USING ERRCODE='23514';
    END IF;
    i := i + 2;
  END LOOP;
  RETURN NEW;
END $$;

DO $$
DECLARE t record; r record; args text; check_sql text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'activity_logs' LOOP
    args := '';
    FOR r IN
      SELECT a.attname AS col, p.relname AS parent
      FROM pg_constraint c
      JOIN pg_class child ON child.oid=c.conrelid
      JOIN pg_class p ON p.oid=c.confrelid
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
      WHERE c.contype='f' AND child.relname=t.tablename AND array_length(c.conkey,1)=1
        AND p.relname NOT IN ('usuarios','planes')
    LOOP
      args := args || CASE WHEN args='' THEN '' ELSE ',' END || format('%L,%L',r.col,r.parent);
    END LOOP;
    IF t.tablename='movimientos_inventario' THEN
      args := args || CASE WHEN args='' THEN '' ELSE ',' END || '''almacen_origen_id'',''almacenes'',''almacen_destino_id'',''almacenes''';
    END IF;
    IF args <> '' THEN
      EXECUTE format('CREATE TRIGGER tenant_relations BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION dolphin_assert_tenant_relations(%s)',t.tablename,args);
    END IF;
  END LOOP;
END $$;
