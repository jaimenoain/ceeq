import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tenant not configured. Ensure your account has a tenant_id in app_metadata.
        </p>
      </main>
    );
  }

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, max_seats")
    .eq("id", tenantId)
    .single();

  if (error || !tenant) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Could not load tenant. You may not have access to this account.
        </p>
      </main>
    );
  }

  const params = await searchParams;
  const tabParam = params.tab ?? "profile";
  const initialTab =
    tabParam === "team" || tabParam === "fields" ? tabParam : "profile";

  return (
    <main className="p-6">
      <SettingsContent
        key={`${tenant.id}-${tenant.name}`}
        tenant={{
          id: tenant.id,
          name: tenant.name,
          max_seats: tenant.max_seats,
        }}
        initialTab={initialTab}
      />
    </main>
  );
}
