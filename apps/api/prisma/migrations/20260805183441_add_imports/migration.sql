-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('product', 'initial_stock', 'customer', 'supplier', 'expense', 'payable', 'receivable');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('completed', 'reverted');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('created', 'updated', 'skipped', 'rejected');

-- CreateEnum
CREATE TYPE "ImportDuplicateAction" AS ENUM ('use_existing', 'create_new', 'register_alias', 'ignore');

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "entity_type" "ImportEntityType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'completed',
    "file_name" TEXT,
    "total_rows" INTEGER NOT NULL,
    "created_count" INTEGER NOT NULL,
    "updated_count" INTEGER NOT NULL,
    "skipped_count" INTEGER NOT NULL,
    "rejected_count" INTEGER NOT NULL,
    "expected_total" DECIMAL(14,2),
    "reconciled_total" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "reverted_at" TIMESTAMP(3),
    "reverted_by" UUID,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "errors" JSONB,
    "result_entity_type" TEXT,
    "result_entity_id" UUID,
    "duplicate_action" "ImportDuplicateAction",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_jobs_company_id_entity_type_created_at_idx" ON "import_jobs"("company_id", "entity_type", "created_at");

-- CreateIndex
CREATE INDEX "import_rows_import_job_id_row_number_idx" ON "import_rows"("import_job_id", "row_number");

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_reverted_by_fkey" FOREIGN KEY ("reverted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TA-DATA-005: tabelas novas com company_id tambem precisam de RLS — a
-- migration de RLS existente (20260805130000_add_row_level_security) só
-- cobriu as tabelas que existiam naquele momento.
GRANT SELECT, INSERT, UPDATE, DELETE ON "import_jobs", "import_rows" TO erp_mafa_app;

ALTER TABLE "import_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "import_jobs" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "import_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_rows" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "import_rows" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
