'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginPageInner() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('reason') === 'subscription'
      ? 'Your trial has ended or subscription is inactive. Please subscribe at hephaestus.work to continue.'
      : null
  )
  const verified = searchParams.get('verified') === 'true'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const checkRes = await fetch('/api/auth/check-access')
      const check = await checkRes.json()

      if (!check.allowed) {
        await supabase.auth.signOut()
        setError(check.reason ?? 'Access denied.')
        setLoading(false)
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Connection error — please check your internet and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 py-12 text-white">
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-orange-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-orange-400/10 blur-[120px]" />

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/70 p-8 shadow-[0_30px_60px_-40px_rgba(249,115,22,0.7)]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white">
            <Image src="/logo.png" alt="Hephaestus" width={28} height={28} className="object-contain" priority />
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-white">Hephaestus</h1>
            <p className="text-xs uppercase tracking-[0.28em] text-white/40">Dispatch</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-display text-2xl font-semibold text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-white/60">Sign in to your dashboard</p>
        </div>

        {verified && (
          <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Email verified — you can now sign in.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
              : <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>
            }
          </button>
        </form>

        <p className="mt-6 text-sm text-white/60">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold text-orange-300 transition hover:text-orange-200"
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}
