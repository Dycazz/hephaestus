import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type === 'email') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })

    if (!error) {
      // Sign out immediately so the user lands on /login unauthenticated.
      // Without this, middleware would see an authenticated session and bounce
      // them to /dashboard, which fails the heph_auth cookie check → redirect loop.
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?verified=true`)
    }
  }

  return NextResponse.redirect(`${origin}/signup?error=verification_failed`)
}
