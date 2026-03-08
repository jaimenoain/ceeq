import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}));

async function loadRequireTenant() {
  const { requireTenantSession } = await import("./require-tenant");
  return requireTenantSession;
}

describe("requireTenantSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const requireTenantSession = await loadRequireTenant();
    const result = await requireTenantSession();

    expect(result).toEqual({ error: "UNAUTHENTICATED", status: 401 });
  });

  it("returns 403 when session has no tenant_id", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          email: "u@example.com",
          created_at: "",
        } as User,
      },
    });

    const requireTenantSession = await loadRequireTenant();
    const result = await requireTenantSession();

    expect(result).toEqual({ error: "NO_TENANT", status: 403 });
  });

  it("returns session object when valid session with tenant_id", async () => {
    const user = {
      id: "user-1",
      app_metadata: { tenant_id: "tenant-abc", role: "admin" },
      user_metadata: {},
      aud: "authenticated",
      email: "u@example.com",
      created_at: "",
    } as User;

    mockGetUser.mockResolvedValue({ data: { user } });

    const requireTenantSession = await loadRequireTenant();
    const result = await requireTenantSession();

    expect("error" in result).toBe(false);
    expect(result).toMatchObject({
      user,
      tenantId: "tenant-abc",
      role: "admin",
    });
  });
});
