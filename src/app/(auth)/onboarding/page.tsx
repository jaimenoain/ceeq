import { OnboardingForm } from "@/features/auth/components/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="flex h-screen w-full bg-slate-50">
      {/* Left Branding Panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-10 text-white lg:flex">
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-6 w-6 rounded bg-white/20" />
          Ceeq
        </div>
        <div className="space-y-4">
          <blockquote className="space-y-2 text-2xl font-medium">
            &ldquo;Ceeq has completely transformed how we source deals. The efficiency gains are undeniable.&rdquo;
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-slate-700" />
            <div>
              <div className="font-semibold">Alex Chen</div>
              <div className="text-sm text-slate-400">Search Fund Principal</div>
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          © 2024 Ceeq Inc. All rights reserved.
        </div>
      </div>

      {/* Right Auth Panel */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:w-1/2">
        <OnboardingForm />
      </div>
    </div>
  );
}
