ALTER TABLE "usuarios" ADD COLUMN "google_sub" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "politicas_aceptadas_en" TIMESTAMP(3);
CREATE UNIQUE INDEX "usuarios_google_sub_key" ON "usuarios"("google_sub");
