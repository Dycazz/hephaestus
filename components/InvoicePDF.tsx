'use client'

/**
 * InvoicePDF — @react-pdf/renderer template for invoice documents.
 *
 * Usage (client-side only):
 *   import { pdf } from '@react-pdf/renderer'
 *   import { InvoicePDF } from '@/components/InvoicePDF'
 *   const blob = await pdf(<InvoicePDF invoice={invoice} businessName="Acme" />).toBlob()
 */

import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { Invoice } from '@/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  businessName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  invoiceLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  invoiceNumber: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#d97706',
    marginBottom: 4,
  },
  // Meta table
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    width: 80,
    color: '#6b7280',
    fontSize: 9,
  },
  metaValue: {
    color: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  // Bill to
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#9ca3af',
    marginBottom: 6,
  },
  clientName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 2,
  },
  clientDetail: {
    color: '#374151',
    fontSize: 9,
    marginBottom: 2,
  },
  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  // Line items table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDescription: { flex: 3, fontSize: 9 },
  colQty: { width: 40, textAlign: 'right', fontSize: 9 },
  colUnit: { width: 70, textAlign: 'right', fontSize: 9 },
  colTotal: { width: 70, textAlign: 'right', fontSize: 9 },
  colHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Totals
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 220,
  },
  totalsLabel: {
    width: 120,
    textAlign: 'right',
    color: '#6b7280',
    fontSize: 9,
    paddingRight: 12,
  },
  totalsValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 9,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    width: 220,
  },
  totalLabel: {
    width: 120,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    paddingRight: 12,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: '#059669',
  },
  // Notes
  notesSection: {
    marginTop: 24,
  },
  notesText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: '#d1d5db',
  },
})

function fmt(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

interface Props {
  invoice: Invoice
  businessName: string
}

export function InvoicePDF({ invoice, businessName }: Props) {
  const client = invoice.client
  const lineItems = invoice.line_items ?? []

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{businessName}</Text>
            <Text style={styles.invoiceLabel}>Invoice</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued:</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.issued_date)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due:</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        {client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bill to</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.email && <Text style={styles.clientDetail}>{client.email}</Text>}
            {client.phone && <Text style={styles.clientDetail}>{client.phone}</Text>}
            {client.address && <Text style={styles.clientDetail}>{client.address}</Text>}
          </View>
        )}

        {/* Line items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.colDescription, styles.colHeaderText]}>Description</Text>
            <Text style={[styles.colQty, styles.colHeaderText]}>Qty</Text>
            <Text style={[styles.colUnit, styles.colHeaderText]}>Unit price</Text>
            <Text style={[styles.colTotal, styles.colHeaderText]}>Total</Text>
          </View>

          {lineItems.map((li, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDescription}>{li.description}</Text>
              <Text style={styles.colQty}>{li.quantity}</Text>
              <Text style={styles.colUnit}>{fmt(li.unit_price_cents)}</Text>
              <Text style={styles.colTotal}>{fmt(li.total_cents)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmt(invoice.subtotal_cents)}</Text>
          </View>
          {invoice.tax_cents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{fmt(invoice.tax_cents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total due</Text>
            <Text style={styles.totalValue}>{fmt(invoice.total_cents)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {invoice.invoice_number} · {businessName} · Thank you for your business.
        </Text>

      </Page>
    </Document>
  )
}
