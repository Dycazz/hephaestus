'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface InviteDetails {
  email: string
  role: string
  orgName: string
}

function SignupForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [inviteLoading, setInviteLoading] = useState(!!token)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setInviteError(data.error)
        } else {
          setInvite(data)
          setEmail(data.email)
        }
      })
      .catch(() => setInviteError('Could not load invitation. Please check the link.'))
      .finally(() => setInviteLoading(false))
  }, [token])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = token
        ? { invitationToken: token, email, password }
        : { businessName, email, password }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
      } else {
        setSubmittedEmail(email)
        setSubmitted(true)
      }
    } catch {
      setError('Connection error. Please check your internet and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-12 text-white">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-orange-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-orange-500/15 blur-[140px]" />

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white">
            <Image src="/logo.png" alt="Hephaestus" width={64} height={64} className="object-contain" priority />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold text-white">Hephaestus</h1>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Dispatch</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/70 p-8 shadow-[0_30px_60px_-40px_rgba(249,115,22,0.6)]">
          {submitted && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-xl font-semibold text-white mb-2">Check your inbox</h2>
              <p className="text-sm text-white/60 mb-1">We sent a verification link to</p>
              <p className="text-sm font-semibold text-white mb-4 break-all">{submittedEmail}</p>
              <p className="text-xs text-white/40">
                Click the link in the email to verify your account, then sign in.
              </p>
            </div>
          )}

          {!submitted && (
            <>
              {token && inviteLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-white/50">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading invitation…</span>
                </div>
              )}

              {token && !inviteLoading && inviteError && (
                <div className="text-center py-4">
                  <p className="text-sm text-red-200 mb-4">{inviteError}</p>
                  <Link href="/signup" className="text-orange-300 text-sm hover:text-orange-200">
                    Sign up without an invitation
                  </Link>
                </div>
              )}

              {(!token || (!inviteLoading && !inviteError)) && (
                <>
                  {invite ? (
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-200 mb-3">
                        🎉 You&apos;ve been invited
                      </div>
                      <h2 className="text-xl font-semibold text-white mb-1">Join {invite.orgName}</h2>
                      <p className="text-sm text-white/60">
                        Create your account to accept the invitation as a{' '}
                        <span className="text-orange-300 font-semibold capitalize">{invite.role}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
                      <p className="text-sm text-white/60">Free trial — no credit card required</p>
                    </div>
                  )}

                  <form onSubmit={handleSignup} className="space-y-4">
                    {!invite && (
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                          Business name
                        </label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={e => setBusinessName(e.target.value)}
                          placeholder="Apex Plumbing Co."
                          required
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                        />
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@yourcompany.com"
                        required
                        className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 pr-10 text-sm text-white placeholder-white/30 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Creating account…' : invite ? 'Accept invitation' : 'Start free trial'}
                    </button>
                  </form>

                  <p className="mt-6 text-sm text-white/60">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-orange-300 hover:text-orange-200">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
