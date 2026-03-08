import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { tenantConfig } from "./tenant-system.config";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/signup/confirm",
  "/onboarding",
  "/auth/callback",
  "/favicon.ico",
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  return PUBLIC_PATHS.includes(pathname);
}

function isProtectedRoute(pathname: string): boolean {
  return tenantConfig.routing.protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function redirectWithCookies(
  request: NextRequest,
  url: string,
  response: NextResponse
): NextResponse {
  const redirectRes = NextResponse.redirect(new URL(url, request.url));
  response.cookies.getAll().forEach((c) =>
    redirectRes.cookies.set(c.name, c.value, c)
  );
  return redirectRes;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options ?? {})
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    if (isProtectedRoute(pathname)) {
      return redirectWithCookies(request, "/login", response);
    }
    return response;
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (tenantId == null || tenantId === "") {
    return redirectWithCookies(
      request,
      tenantConfig.routing.onboardingRoute,
      response
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
