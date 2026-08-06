-- CreateTable
CREATE TABLE "profit_distribution_policies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "reinvestment_rate" DECIMAL(5,2) NOT NULL,
    "pro_labore_rate" DECIMAL(5,2) NOT NULL,
    "reserve_rate" DECIMAL(5,2) NOT NULL,
    "marketing_rate" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "profit_distribution_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profit_distribution_policies_company_id_effective_from_idx" ON "profit_distribution_policies"("company_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "profit_distribution_policies_company_id_effective_from_key" ON "profit_distribution_policies"("company_id", "effective_from");

-- AddForeignKey
ALTER TABLE "profit_distribution_policies" ADD CONSTRAINT "profit_distribution_policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profit_distribution_policies" ADD CONSTRAINT "profit_distribution_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
