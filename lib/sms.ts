/**
 * Send an outbound SMS via ClickSend.
 * Returns the ClickSend message_id on success.
 * Throws if credentials are missing or the API call fails.
 */
export async function sendSMS({
  to,
  body,
  from,
}: {
  to: string
  body: string
  from?: string   // defaults to env CLICKSEND_FROM_NUMBER
}): Promise<string> {
  const username = process.env.CLICKSEND_USERNAME
  const apiKey   = process.env.CLICKSEND_API_KEY
  const fromNum  = from ?? process.env.CLICKSEND_FROM_NUMBER

  if (!username || !apiKey) {
    throw new Error(
      'ClickSend credentials not configured. Set CLICKSEND_USERNAME and CLICKSEND_API_KEY in .env.local',
    )
  }

  const payload = {
    messages: [
      {
        to,
        body,
        from: fromNum || undefined,  // ClickSend uses a shared pool if omitted
        source: 'hephaestus-work',
      },
    ],
  }

  const auth = Buffer.from(`${username}:${apiKey}`).toString('base64')

  const resp = await fetch('https://rest.clicksend.com/v3/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`ClickSend API error: ${resp.status} — ${errText}`)
  }

  const data = await resp.json()
  // ClickSend response: { data: { messages: [{ message_id, status, ... }] } }
  return (data?.data?.messages?.[0]?.message_id as string) ?? ''
}
