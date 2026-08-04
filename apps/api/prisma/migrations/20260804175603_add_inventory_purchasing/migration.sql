-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('in', 'out', 'adjustment', 'return');

-- CreateEnum
CREATE TYPE "StockMovementOriginType" AS ENUM ('purchase', 'adjustment', 'return');

-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('active', 'released', 'consumed');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('draft', 'ordered', 'partially_received', 'received', 'cancelled');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "min_stock" DECIMAL(14,3);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity_available" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "quantity_reserved" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "quantity_in_transit" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,4),
    "origin_type" "StockMovementOriginType" NOT NULL,
    "origin_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "stock_movement_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supplier_id" UUID,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "exchange_rate" DECIMAL(14,6),
    "exchange_rate_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_cost_origin_currency" DECIMAL(14,4) NOT NULL,
    "quantity_received" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_items" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "purchase_receipt_id" UUID NOT NULL,
    "purchase_item_id" UUID NOT NULL,
    "product_variant_id" UUID NOT NULL,
    "quantity_received" DECIMAL(14,3) NOT NULL,
    "unit_cost_final" DECIMAL(14,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_cost_allocations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "purchase_receipt_id" UUID NOT NULL,
    "purchase_receipt_item_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "purchase_cost_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_company_id_product_variant_id_key" ON "stock_balances"("company_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "stock_movements_company_id_product_variant_id_idx" ON "stock_movements"("company_id", "product_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_stock_movement_id_key" ON "stock_adjustments"("stock_movement_id");

-- CreateIndex
CREATE INDEX "stock_adjustments_company_id_product_variant_id_idx" ON "stock_adjustments"("company_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "stock_reservations_company_id_product_variant_id_idx" ON "stock_reservations"("company_id", "product_variant_id");

-- CreateIndex
CREATE INDEX "suppliers_company_id_status_idx" ON "suppliers"("company_id", "status");

-- CreateIndex
CREATE INDEX "purchases_company_id_status_idx" ON "purchases"("company_id", "status");

-- CreateIndex
CREATE INDEX "purchase_items_company_id_purchase_id_idx" ON "purchase_items"("company_id", "purchase_id");

-- CreateIndex
CREATE INDEX "purchase_receipts_company_id_purchase_id_idx" ON "purchase_receipts"("company_id", "purchase_id");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_company_id_purchase_receipt_id_idx" ON "purchase_receipt_items"("company_id", "purchase_receipt_id");

-- CreateIndex
CREATE INDEX "purchase_cost_allocations_company_id_purchase_receipt_id_idx" ON "purchase_cost_allocations"("company_id", "purchase_receipt_id");

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "purchase_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cost_allocations" ADD CONSTRAINT "purchase_cost_allocations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cost_allocations" ADD CONSTRAINT "purchase_cost_allocations_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cost_allocations" ADD CONSTRAINT "purchase_cost_allocations_purchase_receipt_item_id_fkey" FOREIGN KEY ("purchase_receipt_item_id") REFERENCES "purchase_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_cost_allocations" ADD CONSTRAINT "purchase_cost_allocations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
