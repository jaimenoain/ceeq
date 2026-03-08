/**
 * Supabase-backed row types and onboarding state.
 */

export type TenantRow = {
  id: string;
  name: string;
  slug: string | null;
  allowed_domains: string[];
  created_at: string;
};

export type UserRow = {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  created_at: string;
};

export type InvitationRow = {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  invited_by: string;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  created_at: string | null;
};

export type AccessRequestRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string | null;
};

export type OnboardingState =
  | { type: "has_invite"; invitation: InvitationRow; tenantName: string }
  | { type: "domain_match"; tenant: TenantRow }
  | { type: "pending_request"; request: AccessRequestRow; tenantName: string }
  | { type: "create_tenant" };
