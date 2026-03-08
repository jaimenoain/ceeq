import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tenantConfig } from "@/tenant-system.config";
import { MembersClient } from "./members-client";
import type { UserRow } from "@/types/supabase";

const postOnboardingRoute = tenantConfig.routing.postOnboardingRoute;
const adminRoles = tenantConfig.roles.admin;

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  const role = (user.app_metadata?.role as string) ?? "";

  if (!tenantId || !adminRoles.includes(role)) {
    redirect(postOnboardingRoute);
  }

  const [usersRes, invitationsRes, requestsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, role, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("tenant_invitations")
      .select("id, email, role, status, expires_at, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenant_requests")
      .select("id, user_email, user_id, status, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const members: UserRow[] = (usersRes.data ?? []).map((r) => ({
    id: r.id,
    tenant_id: tenantId,
    email: r.email,
    role: r.role,
    created_at: r.created_at,
  }));

  const invitations = invitationsRes.data ?? [];
  const requests = requestsRes.data ?? [];

  return (
    <main className="p-6">
      <MembersClient
        members={members}
        invitations={invitations}
        requests={requests}
      />
    </main>
  );
}
