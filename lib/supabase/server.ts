import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Server-side Supabase client for use in:
 * - Server Components
 * - API Route Handlers
 * - Server Actions
 *
 * Uses the anon key by default (RLS enforced).
 * Pass serviceRole=true only in trusted server contexts like admin/webhook routes.
 *
 * The service role key is read from the Cloudflare request context on every call
 * (via AsyncLocalStorage) rather than from process.env, which is only populated
 * once per worker instance and may miss secrets added after the first cold start.
 */
export async function createClient(serviceRole = false) {
  const cookieStore = await cookies()

  // Resolve the service role key from the live Cloudflare request context so
  // it's always fresh — process.env is a one-time snapshot per worker instance.
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceRole) {
    try {
      const cfEnv = getCloudflareContext().env as Record<string, string | undefined>
      if (cfEnv.SUPABASE_SERVICE_ROLE_KEY) {
        serviceRoleKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY
      }
    } catch {
      // Not running in Cloudflare Workers (e.g. local `next dev`) — process.env fallback is fine
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRole
      ? serviceRoleKey!
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
