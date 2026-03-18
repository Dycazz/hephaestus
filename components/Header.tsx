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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white">
            <Image src="/logo.png" alt="Hephaestus" width={22} height={22} className="object-contain" priority />
          </div>
          <div>
            <span className="font-display text-sm font-semibold text-white">Hephaestus</span>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">Dispatch</p>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center gap-0.5">
          <p className="text-sm font-medium text-white/70">{org?.businessName ?? ''}</p>
          <p className="text-xs text-white/40">{today}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onManageTeam}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <Users className="h-3.5 w-3.5" />
            Team
          </button>

          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:-translate-y-0.5 hover:bg-amber-500"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New appointment
          </button>

          <div className="mx-2 h-4 w-px bg-white/10" />

          <Link
            href="/analytics"
            title="Analytics"
            className="rounded-md p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <BarChart2 className="h-4 w-4" />
          </Link>

          <Link
            href="/settings"
            title="Settings"
            className="rounded-md p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="rounded-md p-1.5 text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
