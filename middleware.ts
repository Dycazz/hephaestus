import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // If Supabase is not yet configured, skip auth checks and let all routes through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const isConfigured = supabaseUrl.startsWith('https://') && !supabaseUrl.includes('YOUR_PROJECT_ID') && !!supabaseAnonKey

  if (!isConfigured) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          // Strip maxAge and expires so auth cookies are session-only
          // (expire when the browser is closed, requiring re-login each visit)
          const { maxAge: _m, expires: _e, ...sessionOptions } = options ?? {}
          supabaseResponse.cookies.set(name, value, sessionOptions)
        })
      },
    },
  })

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Auth check failed — treat as unauthenticated
  }

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/settings') || pathname.startsWith('/analytics')
  const isAdminRoute = pathname.startsWith('/admin')

  // Redirect unauthenticated users away from protected routes
  if (!user && (isProtected || isAdminRoute)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For authenticated users on non-admin protected routes, enforce active plan
  if (user && isProtected) {
    // Require the session marker set by /api/auth/check-access after login.
    // Sessions that predate this check (persistent old cookies) won't have it
    // and must re-authenticate.
    if (!request.cookies.get('heph_auth')) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('reason', 'subscription')
      return NextResponse.redirect(loginUrl)
    }

    try {
      // Fetch the user's org plan in a single query via their profile
      const { data: rows } = await supabase
        .from('profiles')
        .select('organizations(plan, trial_ends_at, suspended_at, subscription_status, subscription_period_end)')
        .eq('id', user.id)
        .limit(1)

      const org = (rows?.[0] as { organizations: Record<string, unknown> | null } | undefined)?.organizations

      if (org) {
        const plan = (org.plan as string) ?? 'trial'
        let active = false

        if (org.suspended_at) {
          active = false
        } else if (plan === 'gifted') {
          active = true
        } else if (plan === 'starter' || plan === 'pro' || plan === 'enterprise') {
          active =
            org.subscription_status === 'active' &&
            !!org.subscription_period_end &&
            new Date(org.subscription_period_end as string) > new Date()
        } else {
          // trial
          active = !!org.trial_ends_at && new Date(org.trial_ends_at as string) > new Date()
        }

        if (!active) {
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('reason', 'subscription')
          return NextResponse.redirect(loginUrl)
        }
      }
    } catch {
      // If the plan check fails, let the request through rather than locking everyone out
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Authenticated users at root go straight to dashboard
  if (pathname === '/' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
