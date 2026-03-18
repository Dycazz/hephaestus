import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// New-org signup
const NewOrgSchema = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

// Invited-user signup — joins an existing org via invitation token
const InviteSchema = z.object({
  invitationToken: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8),
})

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  // ── Invitation-based signup ───────────────────────────────────────────────
  if (body?.invitationToken) {
    const parsed = InviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { invitationToken, email, password } = parsed.data
    const supabaseAdmin = await createClient(true)

    // Validate invitation token
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('invitations')
      .select('id, org_id, email, role, accepted_at, expires_at')
      .eq('token', invitationToken)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }
    if (invitation.accepted_at) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }
    if (invitation.email !== email.toLowerCase().trim()) {
      return NextResponse.json(
        { error: 'Email does not match the invitation' },
        { status: 400 }
      )
    }

    // Create auth user
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    })
    if (authError || !authData.user) {
      const isRateLimit = authError?.message?.toLowerCase().includes('rate limit')
      return NextResponse.json(
        { error: isRateLimit ? 'Too many sign-up attempts. Please try again in a few minutes.' : authError?.message ?? 'Failed to create account' },
        { status: isRateLimit ? 429 : 400 }
      )
    }

    const userId = authData.user.id

    // Create profile linked to the org with the invited role
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      org_id: invitation.org_id,
      role: invitation.role,
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to set up account' }, { status: 500 })
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return NextResponse.json({ success: true }, { status: 201 })
  }

  // ── New-org signup ────────────────────────────────────────────────────────
  const parsed = NewOrgSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { businessName, email, password } = parsed.data
  const supabase = await createClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  })

  if (authError || !authData.user) {
    const isRateLimit = authError?.message?.toLowerCase().includes('rate limit')
    return NextResponse.json(
      { error: isRateLimit ? 'Too many sign-up attempts. Please try again in a few minutes.' : authError?.message ?? 'Failed to create account' },
      { status: isRateLimit ? 429 : 400 }
    )
  }

  const userId = authData.user.id

  // 2. Create organization
  // Use service role to bypass RLS on insert (profile doesn't exist yet)
  const supabaseAdmin = await createClient(true)

  const slug = slugify(businessName)
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: businessName,
      slug,
      business_name: businessName,
      plan: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single()

  if (orgError || !org) {
    // Rollback: delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json(
      { error: 'Failed to create organization. Try a different business name.' },
      { status: 500 }
    )
  }

  // 3. Create profile with owner role
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    org_id: org.id,
    role: 'owner',
  })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    await supabaseAdmin.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Failed to set up account' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
