CREATE TABLE "email_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
  "key" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "heading" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "footer" TEXT NOT NULL,
  "accent" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_templates_empresa_id_key_key" UNIQUE ("empresa_id","key")
);
