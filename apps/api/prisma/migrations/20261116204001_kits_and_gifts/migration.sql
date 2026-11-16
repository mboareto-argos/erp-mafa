-- CreateEnum
CREATE TYPE "ProductKitMode" AS ENUM ('assembled', 'on_demand');

-- CreateEnum
CREATE TYPE "KitAssemblyType" AS ENUM ('assemble', 'disassemble');

-- AlterEnum
ALTER TYPE "StockMovementOriginType" ADD VALUE 'kit_assembly';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "kit_mode" "ProductKitMode";

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "is_gift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kit_components" JSONB;

-- CreateTable
CREATE TABLE "product_kit_components" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "kit_product_id" UUID NOT NULL,
    "component_variant_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "product_kit_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_assemblies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "kit_product_id" UUID NOT NULL,
    "type" "KitAssemblyType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "kit_assemblies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_kit_components_company_id_kit_product_id_idx" ON "product_kit_components"("company_id", "kit_product_id");

-- CreateIndex
CREATE INDEX "kit_assemblies_company_id_kit_product_id_idx" ON "kit_assemblies"("company_id", "kit_product_id");

-- AddForeignKey
ALTER TABLE "product_kit_components" ADD CONSTRAINT "product_kit_components_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_components" ADD CONSTRAINT "product_kit_components_kit_product_id_fkey" FOREIGN KEY ("kit_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_components" ADD CONSTRAINT "product_kit_components_component_variant_id_fkey" FOREIGN KEY ("component_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_components" ADD CONSTRAINT "product_kit_components_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_assemblies" ADD CONSTRAINT "kit_assemblies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_assemblies" ADD CONSTRAINT "kit_assemblies_kit_product_id_fkey" FOREIGN KEY ("kit_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_assemblies" ADD CONSTRAINT "kit_assemblies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Isolamento multiempresa nas tabelas novas (TA-DATA-005), igual às demais.
GRANT SELECT, INSERT, UPDATE, DELETE ON "product_kit_components", "kit_assemblies" TO erp_mafa_app;

ALTER TABLE "product_kit_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_kit_components" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "product_kit_components" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "kit_assemblies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kit_assemblies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "kit_assemblies" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
