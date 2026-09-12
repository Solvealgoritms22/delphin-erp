
-- Lock before changing quota-bearing rows; validate the final transaction state.
CREATE FUNCTION lock_resource_quota() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM id FROM empresas WHERE id = NEW.empresa_id FOR UPDATE;
  RETURN NEW;
END $$;
CREATE FUNCTION enforce_resource_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE subscription_state text; expiry timestamp; user_limit integer; branch_limit integer; product_limit integer; usage_count bigint;
BEGIN
  IF TG_TABLE_NAME <> 'suscripciones' THEN
    IF NEW.estado <> 'ACTIVO' THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND OLD.estado = 'ACTIVO' AND OLD.empresa_id = NEW.empresa_id THEN RETURN NEW; END IF;
    -- Rows inserted then removed/deactivated in the same transaction consume no quota.
    EXECUTE format('SELECT count(*) FROM %I WHERE id = $1 AND estado = ''ACTIVO''', TG_TABLE_NAME) INTO usage_count USING NEW.id;
    IF usage_count = 0 THEN RETURN NEW; END IF;
  ELSE
    IF NEW.estado NOT IN ('ACTIVE', 'TRIAL') THEN RETURN NEW; END IF;
  END IF;
  SELECT s.estado, s.fecha_renovacion, p.max_usuarios, p.max_sucursales, p.max_productos
    INTO subscription_state, expiry, user_limit, branch_limit, product_limit
    FROM suscripciones s JOIN planes p ON p.id = s.plan_id WHERE s.empresa_id = NEW.empresa_id;
  IF subscription_state IS NULL OR subscription_state NOT IN ('ACTIVE', 'TRIAL') OR expiry IS NULL OR expiry <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'SUBSCRIPTION_INACTIVE' USING ERRCODE = '23514';
  END IF;
  SELECT count(*) INTO usage_count FROM membresias WHERE empresa_id = NEW.empresa_id AND estado = 'ACTIVO';
  IF usage_count > user_limit THEN RAISE EXCEPTION 'LIMIT_EXCEEDED:maxUsuarios' USING ERRCODE = '23514'; END IF;
  SELECT count(*) INTO usage_count FROM sucursales WHERE empresa_id = NEW.empresa_id AND estado = 'ACTIVO';
  IF usage_count > branch_limit THEN RAISE EXCEPTION 'LIMIT_EXCEEDED:maxSucursales' USING ERRCODE = '23514'; END IF;
  SELECT count(*) INTO usage_count FROM productos WHERE empresa_id = NEW.empresa_id AND estado = 'ACTIVO';
  IF usage_count > product_limit THEN RAISE EXCEPTION 'LIMIT_EXCEEDED:maxProductos' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER membresias_quota_lock BEFORE INSERT OR UPDATE ON membresias FOR EACH ROW EXECUTE FUNCTION lock_resource_quota();
CREATE CONSTRAINT TRIGGER membresias_quota_check AFTER INSERT OR UPDATE ON membresias DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_resource_quota();

CREATE TRIGGER sucursales_quota_lock BEFORE INSERT OR UPDATE ON sucursales FOR EACH ROW EXECUTE FUNCTION lock_resource_quota();
CREATE CONSTRAINT TRIGGER sucursales_quota_check AFTER INSERT OR UPDATE ON sucursales DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_resource_quota();

CREATE TRIGGER productos_quota_lock BEFORE INSERT OR UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION lock_resource_quota();
CREATE CONSTRAINT TRIGGER productos_quota_check AFTER INSERT OR UPDATE ON productos DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_resource_quota();

CREATE TRIGGER suscripciones_quota_lock BEFORE INSERT OR UPDATE ON suscripciones FOR EACH ROW EXECUTE FUNCTION lock_resource_quota();
CREATE CONSTRAINT TRIGGER suscripciones_quota_check AFTER INSERT OR UPDATE ON suscripciones DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_resource_quota();
