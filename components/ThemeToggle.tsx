'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-8 w-14 rounded-full bg-white/5 border border-white/10 animate-pulse" />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-8 w-14 cursor-pointer items-center rounded-full px-1 transition-all duration-300 focus:outline-none"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.05)',
      }}
      aria-label="Toggle theme"
    >
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all duration-300 transform ${
          isDark ? 'translate-x-6 bg-amber-500' : 'translate-x-0 bg-white'
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-black" fill="currentColor" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
        )}
      </div>
      
      {/* Decorative Icons in the background */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-20 transition-opacity duration-300 pointer-events-none">
        <Sun className={`h-3 w-3 ${isDark ? 'text-white' : 'text-amber-500 opacity-0'}`} />
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 transition-opacity duration-300 pointer-events-none">
        <Moon className={`h-3 w-3 ${isDark ? 'text-white opacity-0' : 'text-black'}`} />
      </div>
    </button>
  )
}
