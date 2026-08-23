ALTER TABLE "usuarios" ADD COLUMN "invitacion_token_hash" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "invitacion_expira_en" TIMESTAMP(3);
CREATE UNIQUE INDEX "usuarios_invitacion_token_hash_key" ON "usuarios"("invitacion_token_hash");
