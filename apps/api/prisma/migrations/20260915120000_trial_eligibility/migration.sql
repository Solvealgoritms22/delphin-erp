-- Persist trial eligibility outside the deletable user and tenant rows.
CREATE TABLE IF NOT EXISTS "trial_eligibilities" (
  "id" TEXT NOT NULL,
  "identity_hash" TEXT NOT NULL,
  "user_id" TEXT,
  "trial_started_at" TIMESTAMP(3),
  "trial_ends_at" TIMESTAMP(3),
  "consumed_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trial_eligibilities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "trial_eligibilities_identity_hash_key" ON "trial_eligibilities"("identity_hash");
CREATE INDEX IF NOT EXISTS "trial_eligibilities_user_id_idx" ON "trial_eligibilities"("user_id");