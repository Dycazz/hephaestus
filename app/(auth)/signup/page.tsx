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

  // Invite state
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [inviteLoading, setInviteLoading] = useState(!!token)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch invite details if token present
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
        // Hard navigation avoids Next.js router deadlock in Cloudflare Workers
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Connection error. Please check your internet and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#111318' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex items-center justify-center" style={{ width: 96, height: 96 }}>
            <Image src="/logo.png" alt="Hephaestus" width={88} height={88} className="object-contain" priority />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Hephaestus</h1>
            <p className="text-xs text-slate-600">Field service management</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
        >
          {/* Invitation loading / error states */}
          {token && inviteLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading invitation…</span>
            </div>
          )}

          {token && !inviteLoading && inviteError && (
            <div className="text-center py-4">
              <p className="text-sm text-red-400 mb-4">{inviteError}</p>
              <Link href="/signup" className="text-blue-400 text-sm hover:underline">
                Sign up without an invitation
              </Link>
            </div>
          )}

          {(!token || (!inviteLoading && !inviteError)) && (
            <>
              {/* Header */}
              {invite ? (
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
                  >
                    🎉 You&apos;ve been invited
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Join {invite.orgName}</h2>
                  <p className="text-sm text-slate-400">
                    Create your account to accept the invitation as a{' '}
                    <span className="text-blue-400 font-semibold capitalize">{invite.role}</span>.
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
                  <p className="text-sm text-slate-400">Free trial — no credit card required</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                {/* Business name — only shown for new-org signups */}
                {!invite && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="Mike's Plumbing & HVAC"
                      required
                      minLength={2}
                      className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Work Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    required
                    readOnly={!!invite}
                    className={`w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${invite ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  {invite && (
                    <p className="text-xs text-slate-500 mt-1">Email is set by the invitation and cannot be changed.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                      className="w-full bg-slate-800/80 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/40 border border-red-700/60 rounded-lg px-3 py-2 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {loading ? 'Creating account…' : invite ? `Join ${invite.orgName}` : 'Create free account'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-400 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#111318' }}>
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}
