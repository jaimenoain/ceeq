import { createAdminClient } from "@/lib/supabase/admin";
import { tenantConfig } from "@/tenant-system.config";
import type {
  AccessRequestRow,
  InvitationRow,
  OnboardingState,
  TenantRow,
} from "@/types/supabase";
import type { User } from "@supabase/supabase-js";

/**
 * Resolves the onboarding state for a user who has no tenant yet.
 * Use only from Server Components or Route Handlers — never expose to the client.
 * Uses the admin client because the user has no tenant and RLS would block queries.
 */
export async function resolveOnboardingState(
  user: Pick<User, "email">
): Promise<OnboardingState> {
  const supabaseAdmin = createAdminClient();
  const email = user.email ?? "";
  const now = new Date().toISOString();

  // Step 1: Pending, non-expired invite matching user email (case-insensitive)
  const { data: invitation } = await supabaseAdmin
    .from("tenant_invitations")
    .select("*")
    .eq("status", "pending")
    .gt("expires_at", now)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (invitation) {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", invitation.tenant_id)
      .single();
    return {
      type: "has_invite",
      invitation: invitation as InvitationRow,
      tenantName: tenant?.name ?? "Workspace",
    };
  }

  // Step 2: Pending access request matching user email (case-insensitive)
  const { data: request } = await supabaseAdmin
    .from("tenant_requests")
    .select("*")
    .eq("status", "pending")
    .ilike("user_email", email)
    .limit(1)
    .maybeSingle();

  if (request) {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", request.tenant_id)
      .single();
    return {
      type: "pending_request",
      request: request as AccessRequestRow,
      tenantName: tenant?.name ?? "Workspace",
    };
  }

  // Step 3: Domain from email; skip if blacklisted; match tenants by allowed_domains
  const domain = email.includes("@") ? email.split("@")[1]!.toLowerCase() : "";
  const isBlacklisted =
    domain !== "" &&
    tenantConfig.email.blacklistedDomains.includes(domain);

  if (!isBlacklisted && domain !== "") {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .contains("allowed_domains", [domain])
      .limit(1)
      .maybeSingle();

    if (tenant) {
      return { type: "domain_match", tenant: tenant as TenantRow };
    }
  }

  // Step 4: No invite, no pending request, no domain match
  return { type: "create_tenant" };
}
