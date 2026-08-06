-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "allocation_method" TEXT NOT NULL DEFAULT 'proportional_value',
ADD COLUMN     "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN     "default_min_stock" DECIMAL(14,3),
ADD COLUMN     "discount_limit" DECIMAL(5,2),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "operation_start_date" DATE,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
