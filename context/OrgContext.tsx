'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Org {
  id: string
  businessName: string
  slug: string
  plan: string
  trialEndsAt: string | null
  reviewUrl: string | null
  smsPhoneNumber: string | null
  userRole: 'owner' | 'dispatcher' | 'viewer' | 'technician' | null
  userTechnicianId: string | null
}

interface OrgContextValue {
  org: Org | null
  loading: boolean
}

const OrgContext = createContext<OrgContextValue>({ org: null, loading: true })

export function OrgProvider({ children }: { children: ReactNode }) {
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrg() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', user.id)
        .single()

      if (!profile) { setLoading(false); return }

      // Fetch linked technician record for technicians
      const { data: tech } = await supabase
        .from('technicians')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle()

      const { data: orgRow } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single()

      if (orgRow) {
        setOrg({
          id: orgRow.id,
          businessName: orgRow.business_name,
          slug: orgRow.slug,
          plan: orgRow.plan,
          trialEndsAt: orgRow.trial_ends_at ?? null,
          reviewUrl: orgRow.review_url,
          smsPhoneNumber: orgRow.sms_phone_number,
          userRole: profile.role as 'owner' | 'dispatcher' | 'viewer' | 'technician',
          userTechnicianId: tech?.id ?? null,
        })
      }
      setLoading(false)
    }

    loadOrg()
  }, [])

  return <OrgContext.Provider value={{ org, loading }}>{children}</OrgContext.Provider>
}

export function useOrg() {
  return useContext(OrgContext)
}
