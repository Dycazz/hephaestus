/**
 * Pure template functions — no side effects, easy to unit test.
 * All return plain strings ready to send via Twilio.
 */

export function reminderTemplate({
  customerFirstName,
  businessName,
  service,
  dateWord,       // "today" | "tomorrow" | "Monday, March 11"
  time,           // "9:00 AM"
  technicianFirst,
  prepChecklist,
}: {
  customerFirstName: string
  businessName: string
  service: string
  dateWord: string
  time: string
  technicianFirst: string
  prepChecklist: string[]
}): string {
  const prep = prepChecklist.length > 0
    ? ` Before we arrive, please: ${prepChecklist.slice(0, 2).join('; ')}.`
    : ''

  return (
    `Hi ${customerFirstName}! This is ${businessName} confirming your ${service} appointment ` +
    `${dateWord} at ${time} with ${technicianFirst}.${prep} ` +
    `Reply 1 to confirm or 2 to reschedule.`
  )
}

export function confirmationTemplate({
  customerFirstName,
  dateWord,
  time,
  technicianFirst,
  serviceIcon,
}: {
  customerFirstName: string
  dateWord: string
  time: string
  technicianFirst: string
  serviceIcon: string
}): string {
  return (
    `Perfect, you're all set ${customerFirstName}! ` +
    `${technicianFirst} will see you ${dateWord} at ${time}. ${serviceIcon}`
  )
}

export function rescheduleTemplate({
  customerFirstName,
  rescheduleUrl,
}: {
  customerFirstName: string
  rescheduleUrl: string
}): string {
  return (
    `No problem ${customerFirstName}! Pick a new time that works for you: ${rescheduleUrl}`
  )
}

export function reviewRequestTemplate({
  customerFirstName,
  technicianFirst,
  businessName,
  reviewUrl,
}: {
  customerFirstName: string
  technicianFirst: string
  businessName: string
  reviewUrl: string
}): string {
  return (
    `Hi ${customerFirstName}, thanks for choosing ${businessName} today! ` +
    `If ${technicianFirst} took great care of you, we'd love a quick Google review — it means the world to us ⭐ ` +
    reviewUrl
  )
}

export function waitlistNotifyTemplate({
  contactFirstName,
  businessName,
  slot,            // "today at 9:00 AM"
  service,
  bookingUrl,
}: {
  contactFirstName: string
  businessName: string
  slot: string
  service: string
  bookingUrl: string
}): string {
  return (
    `Hi ${contactFirstName}! Good news — a ${service} slot just opened up at ${businessName}: ` +
    `${slot}. Grab it here: ${bookingUrl}`
  )
}
