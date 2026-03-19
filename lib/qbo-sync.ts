/**
 * QuickBooks Online sync operations
 * Push clients, invoices, and payments to QBO.
 * Import QBO customers back into the clients table.
 */

import { qboRequest } from '@/lib/qbo'
import { createClient } from '@/lib/supabase/server'
import type { Invoice } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return (cents / 100).toFixed(2)
}

// ── Sync client → QBO Customer ────────────────────────────────────────────────

export async function syncClientToQBO(
  client: { id: string; name: string; email: string | null; phone: string; address: string },
  orgId: string
): Promise<string | null> {
  try {
    const supabase = await createClient(true)

    // Check if already synced
    const { data: existing } = await supabase
      .from('clients')
      .select('qbo_customer_id')
      .eq('id', client.id)
      .single()

    const customerBody = {
      DisplayName:     client.name,
      PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
      PrimaryPhone:    client.phone ? { FreeFormNumber: client.phone } : undefined,
      BillAddr:        client.address ? { Line1: client.address } : undefined,
    }

    let qboCustomerId: string

    if (existing?.qbo_customer_id) {
      // Update existing QBO customer
      // Fetch current SyncToken (required for updates)
      const getRes = await qboRequest(orgId, 'GET', `/customer/${existing.qbo_customer_id}`)
      if (!getRes.ok) return existing.qbo_customer_id  // Return existing on fetch failure

      const { Customer } = await getRes.json() as { Customer: { Id: string; SyncToken: string } }

      const updateRes = await qboRequest(orgId, 'POST', `/customer`, {
        ...customerBody,
        Id:        Customer.Id,
        SyncToken: Customer.SyncToken,
        sparse:    true,
      })

      if (!updateRes.ok) {
        console.error('[QBO] Failed to update customer:', await updateRes.text())
        return existing.qbo_customer_id
      }

      qboCustomerId = existing.qbo_customer_id
    } else {
      // Create new QBO customer
      const createRes = await qboRequest(orgId, 'POST', `/customer`, customerBody)
      if (!createRes.ok) {
        console.error('[QBO] Failed to create customer:', await createRes.text())
        return null
      }

      const { Customer } = await createRes.json() as { Customer: { Id: string } }
      qboCustomerId = Customer.Id
    }

    // Persist qbo_customer_id on our client record
    await supabase
      .from('clients')
      .update({ qbo_customer_id: qboCustomerId })
      .eq('id', client.id)

    return qboCustomerId
  } catch (err) {
    console.error('[QBO] syncClientToQBO error:', err)
    return null
  }
}

// ── Sync invoice → QBO Invoice ────────────────────────────────────────────────

export async function syncInvoiceToQBO(invoice: Invoice, orgId: string): Promise<string | null> {
  try {
    const supabase = await createClient(true)

    // Ensure the customer is synced first
    if (!invoice.client) return null
    const qboCustomerId = await syncClientToQBO(invoice.client, orgId)
    if (!qboCustomerId) return null

    const lineItems = (invoice.line_items ?? []).map((li, i) => ({
      Id:          String(i + 1),
      LineNum:     i + 1,
      Description: li.description,
      Amount:      formatCurrency(li.total_cents),
      DetailType:  'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef:  { value: '1', name: 'Services' },  // Default QBO item
        Qty:      li.quantity,
        UnitPrice: formatCurrency(li.unit_price_cents),
      },
    }))

    const invoiceBody = {
      CustomerRef:  { value: qboCustomerId },
      TxnDate:      invoice.issued_date,
      DueDate:      invoice.due_date,
      DocNumber:    invoice.invoice_number,
      PrivateNote:  invoice.notes ?? undefined,
      Line:         lineItems,
      TxnTaxDetail: invoice.tax_cents > 0 ? {
        TotalTax: formatCurrency(invoice.tax_cents),
      } : undefined,
    }

    let qboInvoiceId: string

    if (invoice.qbo_invoice_id) {
      // Update existing
      const getRes = await qboRequest(orgId, 'GET', `/invoice/${invoice.qbo_invoice_id}`)
      if (!getRes.ok) return invoice.qbo_invoice_id

      const { Invoice: qboInv } = await getRes.json() as { Invoice: { Id: string; SyncToken: string } }

      const updateRes = await qboRequest(orgId, 'POST', `/invoice`, {
        ...invoiceBody,
        Id:        qboInv.Id,
        SyncToken: qboInv.SyncToken,
        sparse:    true,
      })

      if (!updateRes.ok) {
        console.error('[QBO] Failed to update invoice:', await updateRes.text())
        return invoice.qbo_invoice_id
      }

      qboInvoiceId = invoice.qbo_invoice_id
    } else {
      // Create new
      const createRes = await qboRequest(orgId, 'POST', `/invoice`, invoiceBody)
      if (!createRes.ok) {
        console.error('[QBO] Failed to create invoice:', await createRes.text())
        return null
      }

      const { Invoice: qboInv } = await createRes.json() as { Invoice: { Id: string } }
      qboInvoiceId = qboInv.Id
    }

    // Persist qbo_invoice_id
    await supabase
      .from('invoices')
      .update({ qbo_invoice_id: qboInvoiceId })
      .eq('id', invoice.id)

    return qboInvoiceId
  } catch (err) {
    console.error('[QBO] syncInvoiceToQBO error:', err)
    return null
  }
}

// ── Sync payment → QBO Payment ────────────────────────────────────────────────

export async function syncPaymentToQBO(invoice: Invoice, orgId: string): Promise<void> {
  try {
    if (!invoice.qbo_invoice_id) {
      // Sync invoice first to get QBO ID
      await syncInvoiceToQBO(invoice, orgId)
      // Re-fetch to get updated qbo_invoice_id
      const supabase = await createClient(true)
      const { data } = await supabase
        .from('invoices')
        .select('qbo_invoice_id')
        .eq('id', invoice.id)
        .single()
      if (!data?.qbo_invoice_id) return
      invoice = { ...invoice, qbo_invoice_id: data.qbo_invoice_id }
    }

    if (!invoice.client) return
    const supabase = await createClient(true)
    const { data: client } = await supabase
      .from('clients')
      .select('qbo_customer_id')
      .eq('id', invoice.client_id)
      .single()

    if (!client?.qbo_customer_id) return

    const paymentBody = {
      CustomerRef:   { value: client.qbo_customer_id },
      TotalAmt:      formatCurrency(invoice.total_cents),
      TxnDate:       invoice.paid_at ? invoice.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
      PrivateNote:   `Payment for ${invoice.invoice_number}`,
      Line: [{
        Amount:     formatCurrency(invoice.total_cents),
        LinkedTxn:  [{ TxnId: invoice.qbo_invoice_id, TxnType: 'Invoice' }],
      }],
    }

    const res = await qboRequest(orgId, 'POST', `/payment`, paymentBody)
    if (!res.ok) {
      console.error('[QBO] Failed to create payment:', await res.text())
    }
  } catch (err) {
    console.error('[QBO] syncPaymentToQBO error:', err)
  }
}

// ── Import QBO customers → clients ────────────────────────────────────────────

export async function importQBOCustomers(
  orgId: string
): Promise<{ created: number; updated: number; errors: number }> {
  const supabase = await createClient(true)
  let created = 0
  let updated = 0
  let errors = 0

  try {
    // Fetch all active QBO customers (paginate if needed — max 1000 per query)
    const res = await qboRequest(
      orgId,
      'GET',
      `/query?query=${encodeURIComponent("SELECT * FROM Customer WHERE Active = true MAXRESULTS 1000")}`
    )

    if (!res.ok) {
      console.error('[QBO] Failed to fetch customers:', await res.text())
      return { created, updated, errors: 1 }
    }

    const json = await res.json() as {
      QueryResponse: {
        Customer?: Array<{
          Id: string
          DisplayName: string
          PrimaryEmailAddr?: { Address: string }
          PrimaryPhone?: { FreeFormNumber: string }
          BillAddr?: { Line1: string; City?: string; CountrySubDivisionCode?: string; PostalCode?: string }
        }>
      }
    }

    const customers = json.QueryResponse.Customer ?? []

    for (const customer of customers) {
      try {
        const name = customer.DisplayName
        const email = customer.PrimaryEmailAddr?.Address ?? null
        const phone = customer.PrimaryPhone?.FreeFormNumber ?? ''
        const addr = customer.BillAddr
          ? [customer.BillAddr.Line1, customer.BillAddr.City].filter(Boolean).join(', ')
          : ''

        // Check if a client with this QBO ID or email already exists
        const { data: existingByQbo } = await supabase
          .from('clients')
          .select('id')
          .eq('qbo_customer_id', customer.Id)
          .eq('org_id', orgId)
          .single()

        if (existingByQbo) {
          // Update name/phone/address
          await supabase
            .from('clients')
            .update({ name, email, phone, address: addr })
            .eq('id', existingByQbo.id)
          updated++
          continue
        }

        // Try matching by email
        if (email) {
          const { data: existingByEmail } = await supabase
            .from('clients')
            .select('id')
            .eq('email', email)
            .eq('org_id', orgId)
            .single()

          if (existingByEmail) {
            await supabase
              .from('clients')
              .update({ qbo_customer_id: customer.Id, name, phone, address: addr })
              .eq('id', existingByEmail.id)
            updated++
            continue
          }
        }

        // Create new client
        await supabase.from('clients').insert({
          org_id:           orgId,
          name,
          email,
          phone,
          address:          addr,
          qbo_customer_id:  customer.Id,
        })
        created++
      } catch (itemErr) {
        console.error('[QBO] Import customer error:', itemErr)
        errors++
      }
    }

    // Update last_synced_at
    await supabase
      .from('qbo_connections')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('org_id', orgId)

  } catch (err) {
    console.error('[QBO] importQBOCustomers error:', err)
    errors++
  }

  return { created, updated, errors }
}
