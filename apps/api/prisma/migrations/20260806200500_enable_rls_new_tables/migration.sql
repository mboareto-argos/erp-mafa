-- Toda tabela operacional criada após a migration-base de RLS precisa da
-- mesma segunda camada de isolamento multiempresa (TA-DATA-005).
ALTER TABLE "inventory_counts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_counts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventory_counts" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "inventory_count_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_count_items" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "inventory_count_items" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);

ALTER TABLE "profit_distribution_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profit_distribution_policies" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "profit_distribution_policies" FOR ALL TO erp_mafa_app
  USING (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid)
  WITH CHECK (company_id = NULLIF(current_setting('app.current_company_id', true), '')::uuid);
