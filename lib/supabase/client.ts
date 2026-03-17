import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client for use in Client Components ('use client').
 * Call this inside component body or hooks — not at module level.
 */
export function createClient() {
  const runtimeEnv =
    typeof window !== 'undefined'
      ? (window as unknown as { __HEPH_ENV?: Record<string, string | undefined> }).__HEPH_ENV
      : undefined
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? runtimeEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase URL/Anon key missing. Check Pages/Vercel env vars.')
  }
  return createBrowserClient(url, key)
}
