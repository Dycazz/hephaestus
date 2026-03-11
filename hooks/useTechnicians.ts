'use client'

import { useState, useEffect, useCallback } from 'react'

export interface Technician {
  id: string
  name: string
  initials: string
  color: string
  phone?: string | null
}

export function useTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await fetch('/api/technicians')
      if (!res.ok) throw new Error('Failed to load technicians')
      const json = await res.json()
      setTechnicians(json.technicians ?? [])
    } catch {
      // Silently fail — app still works; user can refresh
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTechnicians()
  }, [fetchTechnicians])

  return { technicians, setTechnicians, loading, refetch: fetchTechnicians }
}
