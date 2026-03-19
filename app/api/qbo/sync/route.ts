/**
 * POST /api/qbo/sync — Manual trigger to sync unsynced clients and invoices to QBO
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncClientToQBO, syncInvoiceToQBO } from '@/lib/qbo-sync'
import type { Invoice } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (!['owner', 'dispatcher'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = profile.org_id

  // Verify QBO is connected
  const serviceClient = await createClient(true)
  const { data: conn } = await serviceClient
    .from('qbo_connections')
    .select('id')
    .eq('org_id', orgId)
    .single()

  if (!conn) {
    return NextResponse.json({ error: 'QuickBooks is not connected.' }, { status: 422 })
  }

  const results = {
    clients_synced: 0,
    invoices_synced: 0,
    errors: 0,
  }

  // Sync clients without a QBO ID
  const { data: unsyncedClients } = await supabase
    .from('clients')
    .select('id, name, email, phone, address')
    .is('qbo_customer_id', null)

  for (const client of unsyncedClients ?? []) {
    const result = await syncClientToQBO(client, orgId)
    if (result) results.clients_synced++
    else results.errors++
  }

  // Sync sent/paid invoices without a QBO invoice ID
  const { data: unsyncedInvoices } = await supabase
    .from('invoices')
    .select(`
      *,
      clients ( id, name, email, phone, address ),
      invoice_line_items ( * )
    `)
    .in('status', ['sent', 'paid'])
    .is('qbo_invoice_id', null)

  for (const invoice of (unsyncedInvoices ?? []) as Invoice[]) {
    const result = await syncInvoiceToQBO(invoice, orgId)
    if (result) results.invoices_synced++
    else results.errors++
  }

  // Update last_synced_at
  await serviceClient
    .from('qbo_connections')
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('org_id', orgId)

  return NextResponse.json({ success: true, ...results })
}
