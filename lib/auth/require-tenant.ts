import { createClient } from "@/lib/supabase/server";
import type { IncomingMessage, ServerResponse } from "http";
import type { User } from "@supabase/supabase-js";

export type RequireTenantSuccess = {
  user: User;
  tenantId: string;
  role: string;
};

export type RequireTenantError =
  | { error: "UNAUTHENTICATED"; status: 401 }
  | { error: "NO_TENANT"; status: 403 };

export type RequireTenantResult = RequireTenantSuccess | RequireTenantError;

/**
 * Ensures the request has an authenticated user with a tenant (app_metadata.tenant_id).
 * Use in API routes or server actions to guard tenant-scoped logic.
 *
 * @example
 * // App Router (Route Handler)
 * import { requireTenantSession } from '@/lib/auth/require-tenant';
 *
 * export async function GET() {
 *   const result = await requireTenantSession();
 *   if ('error' in result) {
 *     return NextResponse.json({ message: result.error }, { status: result.status });
 *   }
 *   const { user, tenantId, role } = result;
 *   // ... use tenantId and role
 * }
 *
 * @example
 * // Pages Router (API route)
 * const result = await requireTenantSession(req, res);
 */
export async function requireTenantSession(): Promise<RequireTenantResult>;
export async function requireTenantSession(
  req: IncomingMessage,
  res: ServerResponse
): Promise<RequireTenantResult>;
export async function requireTenantSession(
  req?: IncomingMessage,
  res?: ServerResponse
): Promise<RequireTenantResult> {
  const supabase =
    req != null && res != null
      ? await Promise.resolve(createClient(req, res))
      : await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "UNAUTHENTICATED", status: 401 };
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (tenantId == null || tenantId === "") {
    return { error: "NO_TENANT", status: 403 };
  }

  const role = (user.app_metadata?.role as string) ?? "";

  return { user, tenantId, role };
}
