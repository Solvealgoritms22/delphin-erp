/*
  Warnings:

  - You are about to drop the column `smtp_enabled` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_from` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_host` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_pass` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_port` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_secure` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `smtp_user` on the `empresas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "empresas" DROP COLUMN "smtp_enabled",
DROP COLUMN "smtp_from",
DROP COLUMN "smtp_host",
DROP COLUMN "smtp_pass",
DROP COLUMN "smtp_port",
DROP COLUMN "smtp_secure",
DROP COLUMN "smtp_user";

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "smtp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtp_from" TEXT,
ADD COLUMN     "smtp_host" TEXT,
ADD COLUMN     "smtp_pass" TEXT,
ADD COLUMN     "smtp_port" INTEGER DEFAULT 587,
ADD COLUMN     "smtp_secure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "smtp_user" TEXT;
