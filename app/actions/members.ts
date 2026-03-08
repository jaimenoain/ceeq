"use server";

import { revalidatePath } from "next/cache";
import { requireTenantSession } from "@/lib/auth/require-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantConfig } from "@/tenant-system.config";

const postOnboardingRoute = tenantConfig.routing.postOnboardingRoute;
const adminRoles = tenantConfig.roles.admin;

type MemberActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireAdmin(): Promise<
  | { ok: true; tenantId: string; userId: string }
  | { ok: false; error: string; redirect?: string }
> {
  const result = await requireTenantSession();
  if ("error" in result) {
    return {
      ok: false,
      error: result.error,
      redirect: result.status === 401 ? "/login" : postOnboardingRoute,
    };
  }
  if (!adminRoles.includes(result.role)) {
    return { ok: false, error: "Forbidden", redirect: postOnboardingRoute };
  }
  return { ok: true, tenantId: result.tenantId, userId: result.user.id };
}

export async function updateMemberRole(
  userId: string,
  role: string
): Promise<MemberActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  if (!tenantConfig.roles.all.includes(role)) {
    return { ok: false, error: "Invalid role" };
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("users")
    .update({ role })
    .eq("id", userId)
    .eq("tenant_id", adminCheck.tenantId);

  if (updateError) return { ok: false, error: updateError.message };

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      tenant_id: adminCheck.tenantId,
      role,
    },
  });

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function removeMember(userId: string): Promise<MemberActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("users")
    .delete()
    .eq("id", userId)
    .eq("tenant_id", adminCheck.tenantId);

  if (deleteError) return { ok: false, error: deleteError.message };

  const { data: user } = await admin.auth.admin.getUserById(userId);
  const existing = (user?.user?.app_metadata as Record<string, unknown>) ?? {};
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...existing,
      tenant_id: null,
      role: null,
    },
  });

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function createInvitation(
  email: string,
  role: string
): Promise<MemberActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  if (!tenantConfig.roles.all.includes(role)) {
    return { ok: false, error: "Invalid role" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { ok: false, error: "Email is required" };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("tenant_invitations")
    .select("id")
    .eq("tenant_id", adminCheck.tenantId)
    .eq("status", "pending")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "A pending invitation already exists for this email" };
  }

  const { error: insertError } = await admin.from("tenant_invitations").insert({
    tenant_id: adminCheck.tenantId,
    email: normalizedEmail,
    role,
    invited_by: adminCheck.userId,
    status: "pending",
  });

  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function revokeInvitation(
  invitationId: string
): Promise<MemberActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  const admin = createAdminClient();

  const { error } = await admin
    .from("tenant_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("tenant_id", adminCheck.tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function approveRequest(
  requestId: string,
  role: string
): Promise<MemberActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  if (!tenantConfig.roles.all.includes(role)) {
    return { ok: false, error: "Invalid role" };
  }

  const admin = createAdminClient();

  const { data: request, error: fetchError } = await admin
    .from("tenant_requests")
    .select("*")
    .eq("id", requestId)
    .eq("tenant_id", adminCheck.tenantId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError || !request) {
    return { ok: false, error: "Request not found or already processed" };
  }

  if (request.user_id == null) {
    return { ok: false, error: "Cannot approve: user has not signed up yet" };
  }

  const { error: insertError } = await admin.from("users").insert({
    id: request.user_id,
    tenant_id: adminCheck.tenantId,
    email: request.user_email.trim().toLowerCase(),
    role,
  });

  if (insertError) return { ok: false, error: insertError.message };

  const { error: updateError } = await admin
    .from("tenant_requests")
    .update({
      status: "approved",
      reviewed_by: adminCheck.userId,
    })
    .eq("id", requestId);

  if (updateError) return { ok: false, error: updateError.message };

  await admin.auth.admin.updateUserById(request.user_id, {
    app_metadata: {
      tenant_id: adminCheck.tenantId,
      role,
    },
  });

  revalidatePath("/settings/members");
  return { ok: true };
}

export async function rejectRequest(
  requestId: string
): Promise<MemberActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.ok) return { ok: false, error: adminCheck.error };

  const admin = createAdminClient();

  const { error } = await admin
    .from("tenant_requests")
    .update({
      status: "rejected",
      reviewed_by: adminCheck.userId,
    })
    .eq("id", requestId)
    .eq("tenant_id", adminCheck.tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/members");
  return { ok: true };
}
