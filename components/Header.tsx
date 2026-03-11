'use client'

import { PlusCircle, LogOut, Users, Settings } from 'lucide-react'
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
    <header
      className="text-white"
      style={{
        background: 'linear-gradient(to right, #07101f, #0c1c3a, #07101f)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl shadow-lg shadow-black/30 overflow-hidden flex items-center justify-center shrink-0" style={{ width: 40, height: 40 }}>
            <Image src="/logo.png" alt="Hephaestus" width={36} height={36} className="object-contain" priority />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight leading-none">Hephaestus</span>
            <p className="text-[11px] text-blue-300/60 mt-0.5">Field Service Command Center</p>
          </div>
        </div>

        {/* Business name + date — centre */}
        <div className="hidden md:flex flex-col items-center">
          <p className="text-sm font-semibold text-white/85 leading-none">
            {org?.businessName ?? ''}
          </p>
          <p className="text-[11px] text-blue-300/50 mt-1">{today}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onManageTeam}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border"
            style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#bfdbfe' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
          >
            <Users className="w-3.5 h-3.5" />
            Team
          </button>

          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 shadow-md shadow-blue-900/50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Appointment
          </button>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 border" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-emerald-300">Live</span>
          </div>

          <Link
            href="/settings"
            title="Settings"
            className="p-1.5 rounded-lg transition-all duration-150 text-slate-600 hover:text-slate-300 flex items-center"
            style={{ background: 'transparent' }}
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg transition-all duration-150 text-slate-600 hover:text-slate-300"
            style={{ background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
