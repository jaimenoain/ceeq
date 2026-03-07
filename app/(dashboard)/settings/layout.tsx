import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { shouldRedirectAnalystFromSettings } from "@/lib/settings-rbac";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (shouldRedirectAnalystFromSettings(session)) {
    redirect("/pipeline");
  }

  return <>{children}</>;
}
