import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/shared/types/supabase'

export async function middleware(request: NextRequest) {
  // 1. Handle Mock Mode Bypass
  if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    return NextResponse.next()
  }

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
  const isProtectedPath = path.startsWith('/searcher') || path.startsWith('/investor')

  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/login', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // Copy cookies from the standard response (which might have session updates) to the redirect
    response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })

    return redirectResponse
  }

  if (user && isProtectedPath) {
    // 3. Check Authorization (WorkspaceType)
    // Query public.User to get workspaceId and joined Workspace type
    const { data: userProfile, error } = await supabase
      .from('User')
      .select(`
        workspaceId,
        Workspace (
          workspaceType
        )
      `)
      .eq('id', user.id)
      .single()

    // 4. Routing Logic
    if (error || !userProfile || !userProfile.Workspace) {
      // If we can't determine workspace type, send to onboarding
      if (path !== '/onboarding') {
         const redirectUrl = new URL('/onboarding', request.url)
         const redirectResponse = NextResponse.redirect(redirectUrl)

         response.cookies.getAll().forEach((cookie) => {
             redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
         })

         return redirectResponse
      }
      return response
    }

    // Cast workspaceType explicitly or rely on TS inference from Database
    const workspaceType = userProfile.Workspace.workspaceType

    // Strict Isolation Rules
    let targetRedirect: string | null = null

    if (workspaceType === 'SEARCHER' && path.startsWith('/investor')) {
      targetRedirect = '/searcher/dashboard'
    } else if (workspaceType === 'INVESTOR' && path.startsWith('/searcher')) {
      targetRedirect = '/investor/dashboard'
    }

    if (targetRedirect) {
        const redirectUrl = new URL(targetRedirect, request.url)
        const redirectResponse = NextResponse.redirect(redirectUrl)

        response.cookies.getAll().forEach((cookie) => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })

        return redirectResponse
    }
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
