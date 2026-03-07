import { NextRequest, NextResponse } from "next/server";
import { shouldRedirectAnalystFromSettings } from "@/lib/settings-rbac";

/**
 * E2E RBAC test helper: simulates the outcome when an analyst accesses /settings.
 * Returns 307 Redirect to /pipeline so tests can assert redirect behavior without a real session.
 */
export function GET(request: NextRequest) {
  const simulatedAnalystSession = {
    user: { app_metadata: { role: "analyst" } },
  };
  if (!shouldRedirectAnalystFromSettings(simulatedAnalystSession)) {
    return NextResponse.json(
      { error: "Expected analyst to be redirected" },
      { status: 500 }
    );
  }
  const url = new URL("/pipeline", request.nextUrl.origin);
  return NextResponse.redirect(url, 307);
}
