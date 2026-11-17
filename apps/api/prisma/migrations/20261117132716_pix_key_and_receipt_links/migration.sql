-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "pix_key" TEXT,
ADD COLUMN     "pix_merchant_city" TEXT,
ADD COLUMN     "pix_merchant_name" TEXT;

-- CreateTable
CREATE TABLE "sale_receipt_links" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "sale_receipt_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_receipt_links_token_key" ON "sale_receipt_links"("token");

-- CreateIndex
CREATE INDEX "sale_receipt_links_company_id_sale_id_idx" ON "sale_receipt_links"("company_id", "sale_id");

-- AddForeignKey
ALTER TABLE "sale_receipt_links" ADD CONSTRAINT "sale_receipt_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_receipt_links" ADD CONSTRAINT "sale_receipt_links_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_receipt_links" ADD CONSTRAINT "sale_receipt_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Exceção documentada ao RLS (como invitations): o recibo abre sem login e o
-- token precisa ser resolvido antes de haver empresa no contexto. A tabela só
-- guarda o vínculo token → empresa/venda (BR §10.10, regra 26).
GRANT SELECT, INSERT, UPDATE ON "sale_receipt_links" TO erp_mafa_app;
