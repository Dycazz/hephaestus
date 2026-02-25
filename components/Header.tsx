'use client'

import { Wrench, Wifi, PlusCircle } from 'lucide-react'

interface HeaderProps {
  onAddClient: () => void
}

export function Header({ onAddClient }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 rounded-xl p-2">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">Hephaestus</span>
            </div>
            <p className="text-xs text-slate-400 -mt-0.5">Field Service Command Center</p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-center">
          <p className="text-sm font-semibold text-slate-200">Mike&apos;s Plumbing &amp; HVAC</p>
          <p className="text-xs text-slate-400">{today}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddClient}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 transition-colors rounded-lg px-3 py-1.5"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">New Appointment</span>
          </button>
          <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
            <Wifi className="w-3 h-3 text-green-400" />
            <span className="text-xs font-medium text-green-300">Live</span>
          </div>
        </div>
      </div>
    </header>
  )
}
