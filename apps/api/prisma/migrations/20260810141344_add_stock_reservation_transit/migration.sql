-- AlterEnum
ALTER TYPE "SaleStatus" ADD VALUE 'reserved';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'reservation';
ALTER TYPE "StockMovementType" ADD VALUE 'release';

-- CreateIndex
CREATE INDEX "stock_reservations_company_id_sale_id_idx" ON "stock_reservations"("company_id", "sale_id");

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
