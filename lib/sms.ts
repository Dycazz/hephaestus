import twilio from 'twilio'

/**
 * Send an outbound SMS via Twilio.
 * Returns the Twilio message SID on success.
 * Throws on failure.
 */
export async function sendSMS({
  to,
  body,
  from,
}: {
  to: string
  body: string
  from?: string   // defaults to env TWILIO_PHONE_NUMBER
}): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = from ?? process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env.local')
  }

  const client = twilio(accountSid, authToken)

  const message = await client.messages.create({
    to,
    from: fromNumber,
    body,
  })

  return message.sid
}

/**
 * Validate an inbound Twilio webhook signature.
 * Returns true if the request is genuinely from Twilio.
 */
export function validateTwilioSignature({
  authToken,
  signature,
  url,
  params,
}: {
  authToken: string
  signature: string
  url: string
  params: Record<string, string>
}): boolean {
  return twilio.validateRequest(authToken, signature, url, params)
}
