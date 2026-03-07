-- RLS: Only searchers can UPDATE their tenant. Analysts are locked out (no UPDATE policy for them).
-- USING: row must be the current user's tenant. WITH CHECK: JWT role must be 'searcher'.

CREATE POLICY "tenants_update_searcher_only"
  ON public.tenants FOR UPDATE
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK ((auth.jwt() ->> 'role') = 'searcher');
