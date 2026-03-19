/**
 * Estimate public token helpers — HMAC-SHA256 via Web Crypto API
 * (Cloudflare Workers compatible — no Node.js crypto module)
 */

function getCfEnv(): Record<string, string | undefined> {
  try {
    const cfCtx = (globalThis as Record<symbol, unknown>)[
      Symbol.for('__cloudflare-context__')
    ] as { env?: Record<string, string | undefined> } | undefined
    return cfCtx?.env ?? {}
  } catch {
    return {}
  }
}

function getTokenSecret(): string {
  const secret =
    getCfEnv().ESTIMATE_TOKEN_SECRET ??
    process.env.ESTIMATE_TOKEN_SECRET ??
    'heph-estimate-default-secret-change-in-prod'
  return secret
}

/** Generate a deterministic HMAC-SHA256 token for an estimate. */
export async function generateEstimateToken(estimateId: string): Promise<string> {
  const secret = getTokenSecret()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(estimateId)
  )
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Verify a token matches the expected HMAC for an estimate. */
export async function verifyEstimateToken(estimateId: string, token: string): Promise<boolean> {
  const expected = await generateEstimateToken(estimateId)
  // Constant-time comparison
  if (expected.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i)
  }
  return diff === 0
}
