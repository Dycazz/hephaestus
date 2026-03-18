'use client'

import { LayoutGrid } from 'lucide-react'

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#0f1115' }}>
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/5 animate-pulse" />
            <div className="w-32 h-4 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-8 rounded bg-white/5 animate-pulse" />
            <div className="w-28 h-8 rounded bg-white/5 animate-pulse" />
            <div className="w-8 h-8 rounded bg-white/5 animate-pulse ml-2" />
          </div>
        </div>
      </header>

      {/* StatsBar Skeleton */}
      <div className="border-b border-white/10 bg-black/80">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex gap-8 overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex flex-col gap-2 min-w-[100px]">
                <div className="w-16 h-4 rounded bg-white/5 animate-pulse" />
                <div className="w-8 h-6 rounded bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* View Toggle Skeleton */}
        <div className="w-48 h-10 rounded-xl bg-white/5 border border-white/10 mb-5 animate-pulse" />

        {/* Kanban Board Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map(col => (
            <div key={col} className="flex flex-col gap-3">
              {/* Column Header Skeleton */}
              <div className="h-16 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
              
              {/* Card Skeletons */}
              {[1, 2].map(card => (
                <div 
                  key={card} 
                  className="h-32 rounded-xl border border-white/5 bg-white/5 animate-pulse"
                  style={{ animationDelay: `${(col * 100) + (card * 50)}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
