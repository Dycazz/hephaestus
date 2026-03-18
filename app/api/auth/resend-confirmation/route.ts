import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const Schema = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  const { email } = parsed.data
  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  })

  if (error) {
    const isRateLimit = error.message?.toLowerCase().includes('rate limit')
    return NextResponse.json(
      { error: isRateLimit ? 'Too many attempts. Please wait a few minutes.' : error.message },
      { status: isRateLimit ? 429 : 400 }
    )
  }

  return NextResponse.json({ success: true })
}
