'use client'

import { PlusCircle, LogOut, Users, Settings, DollarSign, Eye, FileText } from 'lucide-react'
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
    <header className="sticky top-0 z-40 glass shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="hephaestus.work" width={32} height={32} className="object-contain" priority />
          <div>
            <span className="font-display text-base font-bold tracking-tight text-text-primary leading-tight">hephaestus.work</span>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-text-secondary/60 font-medium">Dispatch</p>
              {org?.userRole === 'technician' && (
                <span className="flex items-center gap-1 rounded bg-accent/5 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-accent/50 border border-accent/10">
                  <Eye className="h-2.5 w-2.5" />
                  View Only
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center gap-0.5">
          <p className="text-sm font-medium text-text-primary/70">{org?.businessName ?? ''}</p>
          <p className="text-xs text-text-secondary/60">{today}</p>
        </div>

        <div className="flex items-center gap-1">
          {(org?.userRole === 'owner' || org?.userRole === 'dispatcher') && (
            <>
              <button
                onClick={onManageTeam}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary transition hover:bg-white/10 hover:text-text-primary border border-transparent hover:border-white/10"
              >
                <Users className="h-3.5 w-3.5" />
                Team
              </button>

              <button
                onClick={onAddClient}
                className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-black transition hover:-translate-y-0.5 hover:bg-amber-500 shadow-lg shadow-amber-600/20"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                New appointment
              </button>

              <div className="mx-2 h-4 w-px bg-border" />

              <Link
                href="/analytics"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition hover:-translate-y-0.5"
                style={{ color: '#16a34a', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)' }}
              >
                <DollarSign className="h-3.5 w-3.5" />
                Accounting
              </Link>

              {org.plan !== 'trial' && (
                <Link
                  href="/invoices"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition hover:-translate-y-0.5"
                  style={{ color: '#d97706', background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)' }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Invoices
                </Link>
              )}
            </>
          )}



          <Link
            href="/settings"
            title="Settings"
            className="rounded-md p-1.5 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign out"
            className="rounded-md p-1.5 text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
