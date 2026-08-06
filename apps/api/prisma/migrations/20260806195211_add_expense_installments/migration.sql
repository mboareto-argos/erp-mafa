-- AlterTable
ALTER TABLE "payables" ADD COLUMN     "expense_id" UUID;

-- CreateIndex
CREATE INDEX "payables_company_id_expense_id_installment_number_idx" ON "payables"("company_id", "expense_id", "installment_number");

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
