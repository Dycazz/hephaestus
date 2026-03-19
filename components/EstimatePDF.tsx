'use client'

/**
 * EstimatePDF — @react-pdf/renderer template for estimate documents.
 *
 * Usage (client-side only):
 *   import { pdf } from '@react-pdf/renderer'
 *   import { EstimatePDF } from '@/components/EstimatePDF'
 *   const blob = await pdf(<EstimatePDF estimate={estimate} businessName="Acme" />).toBlob()
 */

import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { Estimate } from '@/types'

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
  estimateLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  estimateNumber: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',   // purple — distinguishes from invoices
    marginBottom: 4,
  },
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
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
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
    color: '#7c3aed',
  },
  expiryBanner: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#faf5ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#7c3aed',
  },
  expiryText: {
    fontSize: 9,
    color: '#5b21b6',
  },
  notesSection: {
    marginTop: 24,
  },
  notesText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },
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
  estimate: Estimate
  businessName: string
}

export function EstimatePDF({ estimate, businessName }: Props) {
  const client = estimate.client
  const lineItems = estimate.line_items ?? []

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>{businessName}</Text>
            <Text style={styles.estimateLabel}>Estimate</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.estimateNumber}>{estimate.estimate_number}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issued:</Text>
              <Text style={styles.metaValue}>{fmtDate(estimate.issued_date)}</Text>
            </View>
            {estimate.expiry_date && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Valid until:</Text>
                <Text style={styles.metaValue}>{fmtDate(estimate.expiry_date)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To */}
        {client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prepared for</Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.email && <Text style={styles.clientDetail}>{client.email}</Text>}
            {client.phone && <Text style={styles.clientDetail}>{client.phone}</Text>}
            {client.address && <Text style={styles.clientDetail}>{client.address}</Text>}
          </View>
        )}

        {/* Title if present */}
        {estimate.title && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold' }}>{estimate.title}</Text>
          </View>
        )}

        {/* Line items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services / Items</Text>

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
            <Text style={styles.totalsValue}>{fmt(estimate.subtotal_cents)}</Text>
          </View>
          {estimate.tax_cents > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{fmt(estimate.tax_cents)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimate total</Text>
            <Text style={styles.totalValue}>{fmt(estimate.total_cents)}</Text>
          </View>
        </View>

        {/* Expiry notice */}
        {estimate.expiry_date && (
          <View style={styles.expiryBanner}>
            <Text style={styles.expiryText}>
              This estimate is valid until {fmtDate(estimate.expiry_date)}.
              Please contact us to accept or request changes.
            </Text>
          </View>
        )}

        {/* Notes */}
        {estimate.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{estimate.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {estimate.estimate_number} · {businessName} · This is an estimate, not an invoice.
        </Text>

      </Page>
    </Document>
  )
}
