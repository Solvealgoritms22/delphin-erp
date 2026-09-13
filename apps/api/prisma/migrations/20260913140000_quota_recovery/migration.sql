
-- Lock before changing quota-bearing rows; validate the final transaction state.
CREATE OR REPLACE FUNCTION lock_resource_quota() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'suscripciones' THEN
      IF NEW.plan_id = OLD.plan_id AND NEW.estado = OLD.estado AND NEW.fecha_renovacion IS NOT DISTINCT FROM OLD.fecha_renovacion THEN RETURN NEW; END IF;
    ELSE
      IF NEW.estado = OLD.estado AND NEW.empresa_id = OLD.empresa_id THEN RETURN NEW; END IF;
    END IF;
  END IF;
  PERFORM id FROM empresas WHERE id = NEW.empresa_id FOR UPDATE;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION enforce_resource_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE subscription_state text; expiry timestamp; user_limit integer; branch_limit integer; product_limit integer; usage_count bigint;
BEGIN
  IF TG_TABLE_NAME <> 'suscripciones' THEN
    IF NEW.estado <> 'ACTIVO' THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND OLD.estado = 'ACTIVO' AND OLD.empresa_id = NEW.empresa_id THEN RETURN NEW; END IF;
    -- Rows inserted then removed/deactivated in the same transaction consume no quota.
    EXECUTE format('SELECT count(*) FROM %I WHERE id = $1 AND estado = ''ACTIVO''', TG_TABLE_NAME) INTO usage_count USING NEW.id;
    IF usage_count = 0 THEN RETURN NEW; END IF;
  ELSE
    IF TG_OP = 'UPDATE' AND NEW.plan_id = OLD.plan_id AND NEW.estado = OLD.estado AND NEW.fecha_renovacion IS NOT DISTINCT FROM OLD.fecha_renovacion THEN RETURN NEW; END IF;
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

