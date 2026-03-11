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
    <header style={{ background: '#0d0f17', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ width: 32, height: 32 }}>
            <Image src="/logo.png" alt="Hephaestus" width={28} height={28} className="object-contain" priority />
          </div>
          <span className="text-sm font-semibold text-white/90 tracking-tight">Hephaestus</span>
        </div>

        {/* Business name + date — centre */}
        <div className="hidden md:flex flex-col items-center gap-0.5">
          <p className="text-sm font-medium text-white/70 leading-none">
            {org?.businessName ?? ''}
          </p>
          <p className="text-xs text-slate-600">{today}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onManageTeam}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/6 transition-all duration-150"
          >
            <Users className="w-3.5 h-3.5" />
            Team
          </button>

          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New appointment
          </button>

          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />

          <Link
            href="/settings"
            title="Settings"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/6 transition-all duration-150"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/6 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
