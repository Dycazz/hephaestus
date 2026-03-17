import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
 *
 * We read globalThis[Symbol.for('__cloudflare-context__')] directly rather than
 * importing getCloudflareContext() from @opennextjs/cloudflare (which is a
 * devDependency and would not be bundled into the production Worker).
 */
function getCfEnv(): Record<string, string | undefined> {
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, string | undefined> } | undefined
    return cfCtx?.env ?? {}
  } catch {
    return {}
  }
}

function getEnvVar(name: string): string {
  const cfVal = getCfEnv()[name]
  if (cfVal) return cfVal
  const nodeVal = process.env[name]
  if (nodeVal) return nodeVal
  throw new Error(`Missing required environment variable: ${name}`)
}

export async function createClient(serviceRole = false) {
  const cookieStore = await cookies()

  if (serviceRole) {
    // For service role: we must NOT pass user cookie helpers.
    // @supabase/ssr would replace the Authorization header with the user's session JWT
    // from cookies, which makes Supabase apply RLS instead of bypassing it.
    // Service role key is read from the Cloudflare request env (always current) with
    // process.env as fallback for local dev.
    return createServerClient(
      getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
      getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
      {
        // Empty cookie helpers: prevents session JWT from overriding
        // the service role key in the Authorization header.
        cookies: { getAll: () => [], setAll: () => {} },
      }
    )
  }

  // Regular (anon) client — uses the user's session from cookies, RLS applied.
  return createServerClient(
    getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Strip maxAge and expires to keep auth cookies session-only
              const { maxAge: _m, expires: _e, ...sessionOptions } = options ?? {}
              cookieStore.set(name, value, sessionOptions)
            })
          } catch {
            // setAll called from a Server Component — ignored, middleware handles refresh
          }
        },
      },
    }
  )
}
