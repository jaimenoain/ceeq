/**
 * RBAC for settings route: analysts must be redirected away.
 * Used by app/(dashboard)/settings/layout.tsx and by E2E test route.
 */

export function shouldRedirectAnalystFromSettings(
  session: { user?: { app_metadata?: Record<string, unknown> } } | null
): boolean {
  const role = session?.user?.app_metadata?.role as string | undefined;
  return role === "analyst";
}
