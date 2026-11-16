-- Fase 2: foto principal do produto (BR §10.3 "imagem"). Só a URL pública
-- do arquivo no armazenamento (Vercel Blob — ADR-0003); a imagem nunca vai
-- para o banco. Migration só aditiva: coluna opcional, código antigo segue
-- funcionando. Tabela já sob RLS (tenant_isolation por company_id).
ALTER TABLE "products" ADD COLUMN "image_url" TEXT;
