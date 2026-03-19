/**
 * POST /api/invoices/[id]/send
 *
 * Sends a draft invoice:
 *  1. Generates a signed URL for the PDF (if uploaded)
 *  2. Emails the client via Resend
 *  3. Updates invoice status → 'sent'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceEmail } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
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

  // Fetch invoice with client and line items
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`*, clients ( id, name, email, phone ), invoice_line_items ( * )`)
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status !== 'draft') {
    return NextResponse.json({ error: `Invoice is already ${invoice.status}` }, { status: 409 })
  }
  if (invoice.total_cents <= 0) {
    return NextResponse.json({ error: 'Cannot send an invoice with a $0 total' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('business_name')
    .eq('id', profile.org_id)
    .single()

  const businessName = org?.business_name ?? 'hephaestus.work'

  // 1. Generate signed URL for PDF (valid 7 days)
  let pdfSignedUrl: string | null = null
  if (invoice.pdf_storage_path) {
    const { data: urlData } = await supabase.storage
      .from('invoices')
      .createSignedUrl(invoice.pdf_storage_path, 60 * 60 * 24 * 7)
    pdfSignedUrl = urlData?.signedUrl ?? null
  }

  // 2. Send email to client
  const clientEmail = (invoice.clients as { email: string | null } | null)?.email
  if (clientEmail) {
    await sendInvoiceEmail({
      to:            clientEmail,
      clientName:    (invoice.clients as { name: string }).name,
      invoiceNumber: invoice.invoice_number,
      totalCents:    invoice.total_cents,
      dueDate:       invoice.due_date,
      pdfSignedUrl,
      businessName,
    })
  }

  // 3. Update invoice → sent
  const { data: updated, error } = await supabase
    .from('invoices')
    .update({
      status:     'sent',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoice: updated, emailSent: !!clientEmail })
}
