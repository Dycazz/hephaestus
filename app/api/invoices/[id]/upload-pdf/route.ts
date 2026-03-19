/**
 * POST /api/invoices/[id]/upload-pdf
 *
 * Accepts a multipart/form-data upload with field "pdf" (application/pdf blob).
 * Uploads to Supabase Storage and stores the path on the invoice record.
 * Returns { pdfStoragePath, signedUrl }.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, ctx: RouteContext) {
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

  // Verify invoice belongs to this org
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, org_id')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.org_id !== profile.org_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse multipart form data
  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })

  const file = formData.get('pdf')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing pdf field' }, { status: 400 })
  }

  const arrayBuffer = await (file as File).arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const storagePath = `${profile.org_id}/${id}.pdf`

  // Use service role to bypass storage RLS
  const serviceClient = await createClient(true)

  const { error: uploadError } = await serviceClient.storage
    .from('invoices')
    .upload(storagePath, uint8Array, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[Upload PDF] Storage error:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Store path on invoice
  await supabase
    .from('invoices')
    .update({ pdf_storage_path: storagePath, updated_at: new Date().toISOString() })
    .eq('id', id)

  // Return a short-lived signed URL (1 hour for immediate use)
  const { data: urlData } = await serviceClient.storage
    .from('invoices')
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({
    pdfStoragePath: storagePath,
    signedUrl: urlData?.signedUrl ?? null,
  })
}
