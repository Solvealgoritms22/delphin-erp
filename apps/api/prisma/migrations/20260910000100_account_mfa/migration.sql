CREATE TABLE "mfa_credentials" (
  "usuario_id" TEXT PRIMARY KEY REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "secret" TEXT NOT NULL,
  "enabled_at" TIMESTAMP(3),
  "setup_expires_at" TIMESTAMP(3),
  "recovery_hashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "last_counter" INTEGER NOT NULL DEFAULT -1,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3)
);
