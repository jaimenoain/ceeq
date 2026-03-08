-- Task 02: Invitations & access requests. No RLS in this migration.

-- ---------------------------------------------------------------------------
-- tenant_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL,
  invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Partial unique: one pending invitation per (tenant_id, email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_email_pending
  ON public.tenant_invitations (tenant_id, email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email_status
  ON public.tenant_invitations (email, status);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_status
  ON public.tenant_invitations (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_expires_at
  ON public.tenant_invitations (expires_at);

-- ---------------------------------------------------------------------------
-- tenant_requests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.users(id),
  created_at  timestamptz DEFAULT now()
);

-- Partial unique: one pending request per (tenant_id, user_email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_requests_tenant_email_pending
  ON public.tenant_requests (tenant_id, user_email)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_tenant_requests_tenant_status
  ON public.tenant_requests (tenant_id, status);
