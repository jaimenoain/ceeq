import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/actions/auth";

const navLinks = [
  { href: "/repository", label: "Repository" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/pipeline/closed", label: "Closed Deals" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/repository" className="text-base font-semibold text-foreground">
            ceeq
          </Link>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 p-3">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <form action={logoutAction}>
            <Button variant="outline" className="w-full justify-center" type="submit" aria-label="Logout">
              Logout
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
