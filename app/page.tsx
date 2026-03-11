import { redirect } from 'next/navigation'

/**
 * Root page — proxy.ts redirects based on auth state, but this
 * server component acts as a hard fallback so mockData is never shown.
 */
export default function RootPage() {
  redirect('/login')
}
