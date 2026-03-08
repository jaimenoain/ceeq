-- Task 01: Core tenant schema. Alter existing tenants/users; no RLS in this migration.

-- ---------------------------------------------------------------------------
-- tenants: create if not exists, or add missing columns
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE,
  allowed_domains text[] DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Add columns to existing tenants table (no-op if already present)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT '{}';

-- Ensure UNIQUE on slug when added via ALTER (skip if table was just created with UNIQUE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tenants'::regclass AND conname = 'tenants_slug_key'
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- users: create if not exists, or add missing columns only
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns to existing users table (no-op if already present)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Drop legacy CHECK on role so role is plain TEXT (roles from tenant-system.config)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_tenants_allowed_domains ON public.tenants USING GIN (allowed_domains);
