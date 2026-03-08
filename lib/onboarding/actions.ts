"use server";

/**
 * Onboarding server actions. All actions are safe to retry. Preconditions are checked before writing.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantConfig } from "@/tenant-system.config";

export type ActionResult =
  | { success: true; tenantId?: string }
  | { success: false; error: string };

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Domain: lowercase, no @, basic format (alphanumeric, dots, hyphens). */
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function randomSuffix(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0-9";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

export async function acceptInvitation(
  invitationId: string
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const email = user.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: invitation, error: fetchError } = await admin
    .from("tenant_invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }
  if (!invitation) {
    return { success: false, error: "Invitation not found or no longer valid" };
  }
  if (invitation.email.trim().toLowerCase() !== email) {
    return { success: false, error: "Invitation email does not match" };
  }

  const { error: insertError } = await admin.from("users").insert({
    id: user.id,
    tenant_id: invitation.tenant_id,
    email,
    role: invitation.role,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const { error: updateError } = await admin
    .from("tenant_invitations")
    .update({ status: "accepted" })
    .eq("id", invitationId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata as Record<string, unknown>),
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  return { success: true };
}

export async function requestAccess(tenantId: string): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();
  const userEmail = user.email.trim().toLowerCase();

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError) {
    return { success: false, error: tenantError.message };
  }
  if (!tenant) {
    return { success: false, error: "Tenant not found" };
  }

  const { data: existing } = await admin
    .from("tenant_requests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .ilike("user_email", userEmail)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "A pending request already exists" };
  }

  const { error: insertError } = await admin.from("tenant_requests").insert({
    tenant_id: tenantId,
    user_id: user.id,
    user_email: userEmail,
    status: "pending",
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function createTenant(
  name: string,
  domain?: string
): Promise<ActionResult> {
  const user = await getAuthenticatedUser();
  if (!user?.email) {
    return { success: false, error: "Not authenticated" };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Name is required" };
  }

  let allowedDomains: string[] = [];
  if (domain != null && domain !== "") {
    const d = domain.trim().toLowerCase();
    if (d.includes("@")) {
      return { success: false, error: "Domain must not contain @" };
    }
    if (!DOMAIN_REGEX.test(d)) {
      return {
        success: false,
        error: "Domain must be lowercase and contain only letters, numbers, dots, and hyphens",
      };
    }
    allowedDomains = [d];
  }

  let slug = slugFromName(trimmedName) || "tenant";
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${randomSuffix(6)}`;
  }

  const { data: rpcResult, error: rpcError } = await admin.rpc(
    "create_tenant_and_owner",
    {
      p_tenant_name: trimmedName,
      p_tenant_slug: slug,
      p_allowed_domains: allowedDomains,
      p_user_id: user.id,
      p_user_email: user.email.trim().toLowerCase(),
      p_owner_role: tenantConfig.roles.owner,
    }
  );

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  const tenantId = rpcResult?.tenant_id as string | undefined;
  if (!tenantId) {
    return { success: false, error: "Failed to create tenant" };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata as Record<string, unknown>),
      tenant_id: tenantId,
      role: tenantConfig.roles.owner,
    },
  });

  if (authError) {
    return { success: false, error: authError.message };
  }

  return { success: true, tenantId };
}
