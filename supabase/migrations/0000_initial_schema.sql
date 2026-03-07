-- Phase 1 multi-tenant foundation: tenants and users per DOMAIN_MODEL.md
-- RLS: Default Deny on all tables. Tenant isolation via tenant_id = auth.jwt().tenant_id
-- JWT must include tenant_id (e.g. Supabase Auth hook or app_metadata.tenant_id)

-- tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  max_seats  int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: users can only see their own tenant row
CREATE POLICY "tenants_select_own"
  ON public.tenants FOR SELECT
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);

-- users
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  role          text NOT NULL CHECK (role IN ('searcher', 'analyst')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: CRUD only where tenant_id matches JWT
CREATE POLICY "users_select_tenant"
  ON public.users FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "users_insert_tenant"
  ON public.users FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "users_update_tenant"
  ON public.users FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "users_delete_tenant"
  ON public.users FOR DELETE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
