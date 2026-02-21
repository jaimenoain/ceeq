import { SignupForm } from "@/features/auth/components/signup-form";

export default function SignupPage() {
  return (
    <div className="h-screen w-full flex bg-slate-50">
      <div className="w-1/2 hidden lg:flex bg-slate-900 text-white items-center justify-center p-8">
        <div className="text-3xl font-bold tracking-tight">Streamline your acquisition pipeline.</div>
      </div>
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8">
        <SignupForm />
      </div>
    </div>
  );
}
