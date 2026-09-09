CREATE TABLE "auth_flows" ("id" TEXT NOT NULL PRIMARY KEY, "stateHash" TEXT NOT NULL UNIQUE, "challenge" TEXT NOT NULL, "nonce" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "identity" JSONB, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "auth_flows_expiresAt_idx" ON "auth_flows" ("expiresAt");
