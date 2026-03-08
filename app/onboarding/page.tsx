import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOnboardingState } from "@/lib/onboarding/resolve-onboarding-state";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const state = await resolveOnboardingState(user);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <OnboardingClient state={state} userEmail={user.email ?? null} />
    </main>
  );
}
