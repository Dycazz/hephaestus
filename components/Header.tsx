'use client'

import { Wifi, PlusCircle, LogOut, Users } from 'lucide-react'
import { AnvilIcon } from '@/components/AnvilIcon'
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
    <header className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white shadow-2xl"
      style={{ background: 'linear-gradient(to right, #0a1628, #0d2045, #0a1628)' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-xl p-2 shadow-lg shadow-blue-500/30">
            <AnvilIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">Hephaestus</span>
            </div>
            <p className="text-xs text-blue-300/70 -mt-0.5">Field Service Command Center</p>
          </div>
        </div>

        {/* Business name + date — centre */}
        <div className="hidden sm:flex flex-col items-center">
          <p className="text-sm font-semibold text-white/90">
            {org?.businessName ?? 'Loading…'}
          </p>
          <p className="text-xs text-blue-300/60">{today}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onManageTeam}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors rounded-lg px-3 py-1.5"
          >
            <Users className="w-4 h-4 text-blue-200" />
            <span className="text-xs font-semibold text-blue-100">Team</span>
          </button>

          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 shadow-lg shadow-blue-500/30 transition-colors rounded-lg px-3 py-1.5"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">New Appointment</span>
          </button>

          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">Live</span>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-blue-300/60 hover:text-white transition-colors p-1.5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
