'use client'

import { PlusCircle, LogOut, Users, Settings, BarChart2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useOrg } from '@/context/OrgContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onAddClient: () => void
  onManageTeam: () => void
}

export function Header({ onAddClient, onManageTeam }: HeaderProps) {
  const { org } = useOrg()
  const router = useRouter()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header style={{ background: '#09090b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="bg-white rounded-lg overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: 30, height: 30 }}
          >
            <Image src="/logo.png" alt="Hephaestus" width={26} height={26} className="object-contain" priority />
          </div>
          <span
            className="font-display text-sm font-bold tracking-tight"
            style={{ color: '#f0ece3', letterSpacing: '-0.01em' }}
          >
            Hephaestus
          </span>
        </div>

        {/* Business name + date */}
        <div className="hidden md:flex flex-col items-center gap-0.5">
          <p className="text-sm font-medium leading-none" style={{ color: 'rgba(240,236,227,0.6)' }}>
            {org?.businessName ?? ''}
          </p>
          <p className="text-xs" style={{ color: '#3a3a48' }}>{today}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onManageTeam}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
            style={{ color: '#9494a0' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#f0ece3'
              e.currentTarget.style.background = 'rgba(249,115,22,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#9494a0'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Users className="w-3.5 h-3.5" />
            Team
          </button>

          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150"
            style={{
              background: '#f97316',
              boxShadow: '0 2px 10px rgba(249,115,22,0.25)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#ea580c'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f97316'
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New appointment
          </button>

          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.07)' }} />

          <Link
            href="/analytics"
            title="Analytics"
            className="p-1.5 rounded-md transition-all duration-150"
            style={{ color: '#3a3a48' }}
          >
            <BarChart2 className="w-4 h-4" />
          </Link>

          <Link
            href="/settings"
            title="Settings"
            className="p-1.5 rounded-md transition-all duration-150"
            style={{ color: '#3a3a48' }}
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-md transition-all duration-150"
            style={{ color: '#3a3a48' }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
