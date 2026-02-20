import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/shared/types/supabase'
import type { WorkspaceType } from '@/shared/types/api'

// Exporting logic for verification
export function getProtectedRedirect(
  path: string,
  hasSession: boolean,
  workspaceType: WorkspaceType | null
): string | null {
  const isProtected = path.startsWith('/searcher') || path.startsWith('/investor')

  // 1. Unprotected routes are always allowed
  if (!isProtected) {
    return null
  }

  // 2. No Session -> Login
  if (!hasSession) {
    return '/login'
  }

  // 3. Session, No Workspace -> Onboarding
  if (!workspaceType) {
    // Prevent infinite redirect loop if already on /onboarding
    if (path === '/onboarding') return null
    return '/onboarding'
  }

  // 4. Strict Role Isolation
  if (workspaceType === 'SEARCHER' && path.startsWith('/investor')) {
    return '/searcher/dashboard'
  }
  if (workspaceType === 'INVESTOR' && path.startsWith('/searcher')) {
    return '/investor/dashboard'
  }

  // 5. Allowed
  return null
}

export async function middleware(request: NextRequest) {
  // 1. Handle Mock Mode Bypass
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return NextResponse.next()
  }

  // Create an unmodified response object to start with
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Check Authentication
  // getUser() refreshes the session if needed, updating 'response' cookies via setAll
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 3. Fetch Workspace Type if User Exists
  let workspaceType: WorkspaceType | null = null

  if (user) {
    const { data: userProfile } = await supabase
      .from('User')
      .select(`
        workspaceId,
        Workspace (
          workspaceType
        )
      `)
      .eq('id', user.id)
      .single()

    if (userProfile?.Workspace?.workspaceType) {
      workspaceType = userProfile.Workspace.workspaceType as WorkspaceType
    }
  }

  // 4. Determine Redirect
  const redirectPath = getProtectedRedirect(path, !!user, workspaceType)

  if (redirectPath) {
    const redirectUrl = new URL(redirectPath, request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy cookies from the refreshed session response to the redirect response
    // This ensures the session is persisted across the redirect
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
