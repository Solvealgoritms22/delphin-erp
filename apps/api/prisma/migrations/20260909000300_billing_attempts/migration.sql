CREATE TABLE billing_attempts (
  id TEXT PRIMARY KEY, empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('PROCESSING','SUCCEEDED','UNKNOWN')),
  result JSONB, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX billing_attempts_empresa_id_status_idx ON billing_attempts(empresa_id, status);
CREATE UNIQUE INDEX billing_attempts_one_unresolved_per_company ON billing_attempts(empresa_id) WHERE status IN ('PROCESSING','UNKNOWN');
