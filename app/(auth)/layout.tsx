export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex shrink-0 items-center justify-center border-b border-border px-6 py-4">
        <div className="text-lg font-semibold text-foreground">ceeq</div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
