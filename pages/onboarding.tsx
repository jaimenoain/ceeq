import type { GetServerSideProps } from "next";
import { createClient } from "@/lib/supabase/server";
import { resolveOnboardingState } from "@/lib/onboarding/resolve-onboarding-state";
import { OnboardingClient } from "@/app/onboarding/onboarding-client";
import type { OnboardingState } from "@/types/supabase";

type Props = {
  state: OnboardingState;
  userEmail: string | null;
};

export const getServerSideProps: GetServerSideProps<Props> = async (
  context
) => {
  const supabase = createClient(
    context.req as import("http").IncomingMessage,
    context.res as import("http").ServerResponse
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  const state = await resolveOnboardingState(user);
  return {
    props: {
      state,
      userEmail: user.email ?? null,
    },
  };
};

export default function OnboardingPage({ state, userEmail }: Props) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <OnboardingClient state={state} userEmail={userEmail} />
    </main>
  );
}
