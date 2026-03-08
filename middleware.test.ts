import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockCreateServerClient = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

async function loadMiddleware() {
  const { middleware } = await import("./middleware");
  return middleware;
}

function createRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn(),
      },
    });
  });

  it("redirects unauthenticated user on protected route to /login", async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const middleware = await loadMiddleware();
    const request = createRequest("/tasks");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("http://localhost:3000/login");
  });

  it("redirects limbo user (no tenant_id) on protected route to /onboarding", async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              email: "",
              created_at: "",
            },
          },
        }),
      },
    });

    const middleware = await loadMiddleware();
    const request = createRequest("/tasks");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/onboarding"
    );
  });

  it("allows limbo user on /onboarding (no redirect loop)", async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              app_metadata: {},
              user_metadata: {},
              aud: "authenticated",
              email: "",
              created_at: "",
            },
          },
        }),
      },
    });

    const middleware = await loadMiddleware();
    const request = createRequest("/onboarding");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
  });

  it("allows authenticated user with tenant_id through", async () => {
    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              app_metadata: { tenant_id: "tenant-123" },
              user_metadata: {},
              aud: "authenticated",
              email: "",
              created_at: "",
            },
          },
        }),
      },
    });

    const middleware = await loadMiddleware();
    const request = createRequest("/tasks");
    const response = await middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
  });
});
