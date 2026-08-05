-- current_setting(..., true) devolve string vazia quando a configuração não foi
-- definida na conexão. NULLIF evita erro de cast e faz RLS negar a operação.
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
    EXECUTE format('DROP POLICY tenant_isolation ON public.%I', protected_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO erp_mafa_app USING (company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::uuid) WITH CHECK (company_id = NULLIF(current_setting(''app.current_company_id'', true), '''')::uuid)',
      protected_table
    );
  END LOOP;
END $$;
