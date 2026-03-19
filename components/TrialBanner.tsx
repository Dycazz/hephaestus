'use client'

import Link from 'next/link'
import { useOrg } from '@/context/OrgContext'

export function TrialBanner() {
  const { org } = useOrg()

  if (!org || org.plan !== 'trial') return null

  const now = new Date()
  const endsAt = org.trialEndsAt ? new Date(org.trialEndsAt) : null
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000) : 0
  const expired = daysLeft <= 0

  let bg: string
  let text: string
  let label: string

  if (expired) {
    bg = 'bg-red-600'
    text = 'text-red-50'
    label = 'Trial expired'
  } else if (daysLeft <= 3) {
    bg = 'bg-amber-500'
    text = 'text-amber-950'
    label = `${daysLeft}d left`
  } else {
    bg = 'bg-blue-600'
    text = 'text-blue-50'
    label = `${daysLeft}d left`
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-xs font-semibold tracking-wide ${bg} ${text}`}
    >
      <span className="uppercase">Trial</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
      <Link
        href="/settings#billing"
        className={`ml-1 underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity`}
      >
        Upgrade
      </Link>
    </div>
  )
}
