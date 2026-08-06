-- AlterTable
ALTER TABLE "payables" ADD COLUMN     "installment_count" INTEGER,
ADD COLUMN     "installment_number" INTEGER,
ADD COLUMN     "purchase_id" UUID;

-- AlterTable
ALTER TABLE "receivables" ADD COLUMN     "installment_count" INTEGER,
ADD COLUMN     "installment_number" INTEGER;

-- CreateIndex
CREATE INDEX "payables_company_id_purchase_id_installment_number_idx" ON "payables"("company_id", "purchase_id", "installment_number");

-- CreateIndex
CREATE INDEX "receivables_company_id_sale_id_installment_number_idx" ON "receivables"("company_id", "sale_id", "installment_number");

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
