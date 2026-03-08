-- Task 05: RLS policies. tenant_id and role from app_metadata (auth.jwt()).
-- Admin roles per tenant-system.config: owner, admin.

-- ---------------------------------------------------------------------------
-- public.tenants
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_select_own" ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_searcher_only" ON public.tenants;

CREATE POLICY "tenants_select"
  ON public.tenants FOR SELECT
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- INSERT/DELETE: no policy (deny; service role only)
CREATE POLICY "tenants_update_admin"
  ON public.tenants FOR UPDATE
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK ((auth.jwt() ->> 'role') IN ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- public.users
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_tenant" ON public.users;
DROP POLICY IF EXISTS "users_insert_tenant" ON public.users;
DROP POLICY IF EXISTS "users_update_tenant" ON public.users;
DROP POLICY IF EXISTS "users_delete_tenant" ON public.users;

CREATE POLICY "users_select"
  ON public.users FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- INSERT: no policy (deny; service role only)
CREATE POLICY "users_update"
  ON public.users FOR UPDATE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (
      id = auth.uid()
      OR (auth.jwt() ->> 'role') IN ('owner', 'admin')
    )
  );
CREATE POLICY "users_delete"
  ON public.users FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- public.tenant_invitations
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_invitations_select" ON public.tenant_invitations;
CREATE POLICY "tenant_invitations_select"
  ON public.tenant_invitations FOR SELECT
  USING (
    (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') IN ('owner', 'admin'))
    OR (lower((SELECT email FROM auth.users WHERE id = auth.uid())) = lower(email))
  );

-- INSERT/UPDATE/DELETE: no policy (deny; service role only)

-- ---------------------------------------------------------------------------
-- public.tenant_requests
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_requests_select" ON public.tenant_requests;
CREATE POLICY "tenant_requests_select"
  ON public.tenant_requests FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
  );

-- INSERT/UPDATE/DELETE: no policy (deny; service role only)
