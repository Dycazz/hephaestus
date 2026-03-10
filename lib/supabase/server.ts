import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for use in:
 * - Server Components
 * - API Route Handlers
 * - Server Actions
 *
 * Uses the anon key by default (RLS enforced).
 * Pass serviceRole=true only in trusted server contexts like cron/webhook routes.
 */
export async function createClient(serviceRole = false) {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from a Server Component — ignored, middleware handles refresh
          }
        },
      },
    }
  )
}
