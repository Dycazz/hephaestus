'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || 'Connection error — please check your internet and try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#090909' }}
    >
      {/* Ambient forge glow — bottom left */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '-200px',
          bottom: '-150px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      {/* Subtle top-right accent */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: '-100px',
          top: '-100px',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div className="w-full max-w-sm relative slide-up-in">
        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="rounded-xl overflow-hidden flex items-center justify-center bg-white shrink-0"
            style={{
              width: 42,
              height: 42,
              boxShadow: '0 0 28px rgba(249,115,22,0.18)',
            }}
          >
            <Image src="/logo.png" alt="Hephaestus" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <h1
              className="font-display font-bold leading-none"
              style={{ fontSize: '1.1rem', color: '#f0ece3', letterSpacing: '-0.02em' }}
            >
              Hephaestus
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#3a3a48' }}>Field service management</p>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h2
            className="font-display font-bold mb-1"
            style={{ fontSize: '1.7rem', color: '#f0ece3', letterSpacing: '-0.03em' }}
          >
            Welcome back
          </h2>
          <p className="text-sm" style={{ color: '#9494a0' }}>Sign in to your dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: '#9494a0', letterSpacing: '0.02em' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
              style={{
                background: '#111114',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#f0ece3',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: '#9494a0', letterSpacing: '0.02em' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all pr-10"
                style={{
                  background: '#111114',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: '#f0ece3',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#3a3a48' }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-2.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 text-sm text-white"
            style={{
              background: loading ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #ea580c, #f97316)',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.25)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>
        </form>

        <p className="text-sm mt-6" style={{ color: '#9494a0' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold transition-colors"
            style={{ color: '#f97316' }}
          >
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
