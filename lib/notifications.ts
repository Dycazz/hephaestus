/**
 * Expo Push Notification helper
 *
 * Uses the Expo Push API (https://exp.host/--/api/v2/push/send) to send
 * push notifications to mobile devices.
 *
 * No SDK needed — the Expo Push API accepts a simple JSON POST.
 */

interface PushMessage {
  to: string        // Expo push token (ExponentPushToken[…])
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  channelId?: string
}

interface PushReceipt {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

/**
 * Send one or more push notifications via the Expo Push API.
 * Silently logs errors instead of throwing — push should never break the main flow.
 */
export async function sendExpoPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return

  // Filter out any obviously invalid tokens
  const valid = messages.filter(m => m.to.startsWith('ExponentPushToken[') || m.to.startsWith('ExpoPushToken['))
  if (valid.length === 0) return

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(valid.length === 1 ? valid[0] : valid),
    })

    if (!res.ok) {
      console.error('[Push] Expo API error:', res.status, await res.text())
      return
    }

    const json = await res.json()
    const receipts: PushReceipt[] = Array.isArray(json.data) ? json.data : [json.data]
    for (const receipt of receipts) {
      if (receipt?.status === 'error') {
        console.error('[Push] Receipt error:', receipt.message, receipt.details)
      }
    }
  } catch (err) {
    console.error('[Push] Failed to send:', err)
  }
}

// ── Invoice email ───────────────────────────────────────────────────────────

/**
 * Send an invoice email to a client via the Resend REST API.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.
 * Silently logs a warning if the API key is not configured.
 */
export async function sendInvoiceEmail(params: {
  to: string
  clientName: string
  invoiceNumber: string
  totalCents: number
  dueDate: string          // "YYYY-MM-DD"
  pdfSignedUrl: string | null
  businessName: string
}): Promise<void> {
  // Resolve env from CF context or process.env
  let apiKey: string | undefined
  let fromEmail: string | undefined
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, string | undefined> } | undefined
    apiKey = cfCtx?.env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY
    fromEmail = cfCtx?.env?.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL
  } catch {
    apiKey = process.env.RESEND_API_KEY
    fromEmail = process.env.RESEND_FROM_EMAIL
  }

  if (!apiKey) {
    console.warn('[Invoice Email] RESEND_API_KEY not configured — skipping email for invoice', params.invoiceNumber)
    return
  }

  const from = fromEmail ?? 'noreply@hephaestus.work'

  const formattedTotal = '$' + (params.totalCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const formattedDue = new Date(params.dueDate + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #1a1a1a; padding: 28px 32px;">
      <p style="color: #d97706; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 4px;">${params.businessName}</p>
      <h1 style="color: #fff; font-size: 24px; margin: 0;">${params.invoiceNumber}</h1>
    </div>
    <div style="padding: 28px 32px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">Hi ${params.clientName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">You have a new invoice from <strong>${params.businessName}</strong>.</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Invoice</span>
          <span style="color: #111827; font-weight: 600; font-size: 14px;">${params.invoiceNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Due date</span>
          <span style="color: #111827; font-weight: 600; font-size: 14px;">${formattedDue}</span>
        </div>
        <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between;">
          <span style="color: #374151; font-size: 16px; font-weight: 600;">Total due</span>
          <span style="color: #059669; font-size: 20px; font-weight: 700;">${formattedTotal}</span>
        </div>
      </div>

      ${params.pdfSignedUrl ? `
      <a href="${params.pdfSignedUrl}" style="display: block; border: 1px solid #e5e7eb; color: #374151; text-align: center; padding: 12px; border-radius: 8px; font-size: 14px; text-decoration: none; margin-bottom: 24px;">
        View / Download PDF
      </a>` : ''}

      <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you have any questions, please reply to this email.</p>
    </div>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: `Invoice ${params.invoiceNumber} from ${params.businessName} — ${formattedTotal} due ${formattedDue}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[Invoice Email] Resend API error:', res.status, body)
    }
  } catch (err) {
    console.error('[Invoice Email] Failed to send:', err)
  }
}

// ── Estimate email ──────────────────────────────────────────────────────────

/**
 * Send an estimate email to a client with a link to view and accept/decline online.
 */
export async function sendEstimateEmail(params: {
  to: string
  clientName: string
  estimateNumber: string
  totalCents: number
  expiryDate: string | null   // "YYYY-MM-DD" or null
  viewUrl: string             // public estimate view URL
  businessName: string
}): Promise<void> {
  let apiKey: string | undefined
  let fromEmail: string | undefined
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, string | undefined> } | undefined
    apiKey = cfCtx?.env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY
    fromEmail = cfCtx?.env?.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL
  } catch {
    apiKey = process.env.RESEND_API_KEY
    fromEmail = process.env.RESEND_FROM_EMAIL
  }

  if (!apiKey) {
    console.warn('[Estimate Email] RESEND_API_KEY not configured — skipping email for estimate', params.estimateNumber)
    return
  }

  const from = fromEmail ?? 'noreply@hephaestus.work'

  const formattedTotal = '$' + (params.totalCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const formattedExpiry = params.expiryDate
    ? new Date(params.expiryDate + 'T12:00:00').toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 32px 16px;">
  <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #1c1917; padding: 24px 28px;">
      <h1 style="color: #fff; font-size: 20px; font-weight: 700; margin: 0;">${params.businessName}</h1>
      <p style="color: #a8a29e; font-size: 14px; margin: 4px 0 0;">Estimate ${params.estimateNumber}</p>
    </div>
    <div style="padding: 28px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">Hi ${params.clientName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">
        We've prepared an estimate for you. Please review the details and let us know if you'd like to proceed.
      </p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Estimate</span>
          <span style="color: #111827; font-size: 14px; font-weight: 600;">${params.estimateNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Total</span>
          <span style="color: #111827; font-size: 16px; font-weight: 700;">${formattedTotal}</span>
        </div>
        ${formattedExpiry ? `
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #6b7280; font-size: 14px;">Valid until</span>
          <span style="color: #111827; font-size: 14px; font-weight: 600;">${formattedExpiry}</span>
        </div>` : ''}
      </div>

      <a href="${params.viewUrl}" style="display: block; background: #d97706; color: #fff; text-align: center; padding: 14px; border-radius: 8px; font-weight: 700; font-size: 15px; text-decoration: none; margin-bottom: 16px;">
        View &amp; Accept Estimate
      </a>

      <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you have any questions, please reply to this email.</p>
    </div>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: `Estimate ${params.estimateNumber} from ${params.businessName} — ${formattedTotal}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[Estimate Email] Resend API error:', res.status, body)
    }
  } catch (err) {
    console.error('[Estimate Email] Failed to send:', err)
  }
}

/**
 * Send a push notification to a technician when they are assigned a new appointment.
 */
export async function notifyTechnicianAssigned(params: {
  pushToken: string
  customerName: string
  service: string
  scheduledDate: string   // display string e.g. "Today", "Tomorrow", "Mar 15"
  scheduledTime: string
  appointmentId: string
}) {
  await sendExpoPushNotifications([{
    to: params.pushToken,
    title: `New job: ${params.customerName}`,
    body: `${params.service} • ${params.scheduledDate} at ${params.scheduledTime}`,
    data: { appointmentId: params.appointmentId, type: 'assignment' },
    sound: 'default',
    channelId: 'default',
  }])
}

/**
 * Send a push notification to dispatchers when a customer SMS reply arrives.
 */
export async function notifyDispatcherSmsReply(params: {
  pushToken: string
  customerName: string
  message: string
  appointmentId: string
}) {
  await sendExpoPushNotifications([{
    to: params.pushToken,
    title: `Reply from ${params.customerName}`,
    body: params.message.length > 100 ? params.message.slice(0, 97) + '…' : params.message,
    data: { appointmentId: params.appointmentId, type: 'sms_reply' },
    sound: 'default',
    channelId: 'default',
  }])
}
