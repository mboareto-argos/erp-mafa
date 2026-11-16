-- Fase 2: código de barras (EAN/UPC ou conteúdo de QR) por variação de
-- produto — BR §10.3 ("código de barras próprio"; único na empresa quando
-- informado). Migration só aditiva: coluna opcional + índice único; código
-- antigo continua funcionando sem conhecer a coluna. NULLs não conflitam
-- no índice único do Postgres, então produtos sem código não colidem.
-- A tabela já está sob RLS (tenant_isolation por company_id).
ALTER TABLE "product_variants" ADD COLUMN "barcode" TEXT;

CREATE UNIQUE INDEX "product_variants_company_id_barcode_key" ON "product_variants"("company_id", "barcode");
