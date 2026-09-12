-- DropForeignKey
ALTER TABLE "almacenes" DROP CONSTRAINT "tenant_fk_950f7f482eddb4a0274f7e4894397a30";

-- DropForeignKey
ALTER TABLE "billing_attempts" DROP CONSTRAINT "billing_attempts_empresa_id_fkey";

-- DropForeignKey
ALTER TABLE "cotizaciones" DROP CONSTRAINT "tenant_fk_25f9c8274cabdcf8107aedba1443d2c8";

-- DropForeignKey
ALTER TABLE "cotizaciones" DROP CONSTRAINT "tenant_fk_284a3a49ceff89fb2e250fe118388b70";

-- DropForeignKey
ALTER TABLE "cotizaciones" DROP CONSTRAINT "tenant_fk_d3e2f75667ec358aeaebea81c41208c5";

-- DropForeignKey
ALTER TABLE "cotizaciones" DROP CONSTRAINT "tenant_fk_d60b278203010283583fde8e628096a9";

-- DropForeignKey
ALTER TABLE "email_templates" DROP CONSTRAINT "email_templates_empresa_id_fkey";

-- DropForeignKey
ALTER TABLE "facturas_compra" DROP CONSTRAINT "tenant_fk_68e46b61e27b11b8d563689eb2198f67";

-- DropForeignKey
ALTER TABLE "facturas_compra" DROP CONSTRAINT "tenant_fk_def278ec75d33f72b0cb482174dfc930";

-- DropForeignKey
ALTER TABLE "facturas_compra" DROP CONSTRAINT "tenant_fk_f10cf4bc915d051335b0f1d33a908079";

-- DropForeignKey
ALTER TABLE "facturas_venta" DROP CONSTRAINT "tenant_fk_578f2148b238f7a733f03aec481978f6";

-- DropForeignKey
ALTER TABLE "facturas_venta" DROP CONSTRAINT "tenant_fk_8eb3f30c10e3733ad852ca9fb08c90c3";

-- DropForeignKey
ALTER TABLE "facturas_venta" DROP CONSTRAINT "tenant_fk_a9802b39d33fd94586748702c4843801";

-- DropForeignKey
ALTER TABLE "facturas_venta" DROP CONSTRAINT "tenant_fk_efa5766d2eca1554eb5c5c2307369b2a";

-- DropForeignKey
ALTER TABLE "facturas_venta" DROP CONSTRAINT "tenant_fk_f4b71a6657f1a0a5fd8cadabac18a1b9";

-- DropForeignKey
ALTER TABLE "inventario_stocks" DROP CONSTRAINT "tenant_fk_3aaf583c6c80d6c53a646355ac963e14";

-- DropForeignKey
ALTER TABLE "inventario_stocks" DROP CONSTRAINT "tenant_fk_8ad4d7602e929de3dc76a8bcc2fbd52b";

-- DropForeignKey
ALTER TABLE "membresias" DROP CONSTRAINT "tenant_fk_57f7963bc207bc1470a577b478843348";

-- DropForeignKey
ALTER TABLE "mfa_credentials" DROP CONSTRAINT "mfa_credentials_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "movimientos_inventario" DROP CONSTRAINT "tenant_fk_220ba1717c43eb54ec96f060dfdc14c5";

-- DropForeignKey
ALTER TABLE "pagos_clientes" DROP CONSTRAINT "tenant_fk_721d56092bdf444d4e5b83c64cc4b713";

-- DropForeignKey
ALTER TABLE "pagos_proveedores" DROP CONSTRAINT "tenant_fk_9ba0f37da59391c94d9a7c6df27fa38c";

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "tenant_fk_120bc9dcf251824d65c6e0e849f9c335";

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "tenant_fk_64704aea445c1900c17eeb3248935b8a";

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "tenant_fk_65285758def23fc0c8171e3070edec8c";

-- DropForeignKey
ALTER TABLE "productos" DROP CONSTRAINT "tenant_fk_77730bb9bd3713aa37b85cb3cbb965fc";

-- DropForeignKey
ALTER TABLE "productos_insumos" DROP CONSTRAINT "tenant_fk_4201cb4badd5e95c889d6d0c18800f55";

-- DropForeignKey
ALTER TABLE "productos_insumos" DROP CONSTRAINT "tenant_fk_6f4763708fab992284d50a47345df7c5";

-- DropForeignKey
ALTER TABLE "productos_insumos" DROP CONSTRAINT "tenant_fk_8605f3518744e7f1004a58fb49233f68";

-- DropForeignKey
ALTER TABLE "promociones" DROP CONSTRAINT "tenant_fk_6c48514b19e350c1bdcfb9527989b918";

-- DropForeignKey
ALTER TABLE "promociones" DROP CONSTRAINT "tenant_fk_78fb4eb432dbaf68e43e5484908271b6";

-- DropForeignKey
ALTER TABLE "promociones_productos" DROP CONSTRAINT "tenant_fk_b87d61cd14fb599c6ed449694c6dbdfe";

-- DropForeignKey
ALTER TABLE "promociones_productos" DROP CONSTRAINT "tenant_fk_d66c137f75e6eafee0215329a8028fa4";

-- DropIndex
DROP INDEX "tenant_identity_16764";

-- DropIndex
DROP INDEX "tenant_identity_16436";

-- DropIndex
DROP INDEX "tenant_identity_16471";

-- DropIndex
DROP INDEX "tenant_identity_16804";

-- DropIndex
DROP INDEX "tenant_identity_16976";

-- DropIndex
DROP INDEX "tenant_identity_16444";

-- DropIndex
DROP INDEX "productos_codigo_trgm_idx";

-- DropIndex
DROP INDEX "productos_empresa_creado_idx";

-- DropIndex
DROP INDEX "productos_nombre_trgm_idx";

-- DropIndex
DROP INDEX "tenant_identity_16460";

-- DropIndex
DROP INDEX "tenant_identity_17182";

-- DropIndex
DROP INDEX "tenant_identity_16481";

-- DropIndex
DROP INDEX "tenant_identity_16429";

-- DropIndex
DROP INDEX "tenant_identity_16403";

-- DropIndex
DROP INDEX "tenant_identity_16991";

-- DropIndex
DROP INDEX "tenant_identity_16452";

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "documento_identidad" TEXT,
ADD COLUMN     "oficio" TEXT,
ADD COLUMN     "telefono" TEXT;

-- DropTable
DROP TABLE "document_counters";

-- AddForeignKey
ALTER TABLE "mfa_credentials" ADD CONSTRAINT "mfa_credentials_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

