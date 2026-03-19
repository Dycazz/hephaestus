/**
 * POST /api/invoices/[id]/send
 *
 * Sends a draft invoice:
 *  1. Creates a Stripe Payment Link for the total
 *  2. Generates a signed URL for the PDF (if uploaded)
 *  3. Emails the client via Resend
 *  4. Updates invoice status → 'sent'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInvoicePaymentLink } from '@/lib/stripe'
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

  // 1. Create Stripe Payment Link
  let paymentLinkUrl: string | null = null
  try {
    paymentLinkUrl = await createInvoicePaymentLink({
      invoiceId:      invoice.id,
      invoiceNumber:  invoice.invoice_number,
      totalCents:     invoice.total_cents,
      orgId:          profile.org_id,
    })
  } catch (err) {
    console.error('[Invoice Send] Failed to create payment link:', err)
    // Non-fatal — still send the invoice without an online payment option
  }

  // 2. Generate signed URL for PDF (valid 7 days)
  let pdfSignedUrl: string | null = null
  if (invoice.pdf_storage_path) {
    const { data: urlData } = await supabase.storage
      .from('invoices')
      .createSignedUrl(invoice.pdf_storage_path, 60 * 60 * 24 * 7)
    pdfSignedUrl = urlData?.signedUrl ?? null
  }

  // 3. Send email to client
  const clientEmail = (invoice.clients as { email: string | null } | null)?.email
  if (clientEmail) {
    await sendInvoiceEmail({
      to:             clientEmail,
      clientName:     (invoice.clients as { name: string }).name,
      invoiceNumber:  invoice.invoice_number,
      totalCents:     invoice.total_cents,
      dueDate:        invoice.due_date,
      paymentLinkUrl,
      pdfSignedUrl,
      businessName,
    })
  }

  // 4. Update invoice → sent, store payment link
  const { data: updated, error } = await supabase
    .from('invoices')
    .update({
      status:                  'sent',
      stripe_payment_link_url: paymentLinkUrl,
      updated_at:              new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoice: updated, paymentLinkUrl, emailSent: !!clientEmail })
}
