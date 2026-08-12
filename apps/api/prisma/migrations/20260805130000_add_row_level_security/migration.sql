-- TA-DATA-005: defesa em profundidade por empresa. A aplicação usa o papel
-- erp_mafa_app (sem BYPASSRLS) e define app.current_company_id dentro da
-- transação de cada requisição autenticada.
-- Senha abaixo é só o padrão de bootstrap local/teste — provedores gerenciados
-- (Neon, RDS etc.) rejeitam senha fraca na criação do papel, e mesmo que
-- aceitassem, runbook.md exige trocar por uma senha própria do ambiente antes
-- do primeiro deploy real (nunca reaproveitar esta).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_mafa_app') THEN
    CREATE ROLE erp_mafa_app LOGIN PASSWORD 'ErpMafaApp!2026Local' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO erp_mafa_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_mafa_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erp_mafa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erp_mafa_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO erp_mafa_app;

DO $$
DECLARE
  protected_table text;
BEGIN
  FOR protected_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'company_id'
      AND table_name NOT IN ('memberships', 'invitations', 'refresh_tokens')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', protected_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', protected_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO erp_mafa_app USING (company_id = current_setting(''app.current_company_id'', true)::uuid) WITH CHECK (company_id = current_setting(''app.current_company_id'', true)::uuid)',
      protected_table
    );
  END LOOP;
END $$;
