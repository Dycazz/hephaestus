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
