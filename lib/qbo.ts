/**
 * QuickBooks Online OAuth 2.0 + API helpers
 * Fetch-based — no Node.js SDK, Cloudflare Workers compatible.
 */

import { createClient } from '@/lib/supabase/server'

// ── Env helpers ────────────────────────────────────────────────────────────────

export interface QBOConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  sandbox: boolean
}

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

export function getQBOConfig(): QBOConfig {
  const env = getCfEnv()
  return {
    clientId:     env.QBO_CLIENT_ID     ?? process.env.QBO_CLIENT_ID     ?? '',
    clientSecret: env.QBO_CLIENT_SECRET ?? process.env.QBO_CLIENT_SECRET ?? '',
    redirectUri:  env.QBO_REDIRECT_URI  ?? process.env.QBO_REDIRECT_URI  ?? '',
    sandbox:      (env.QBO_SANDBOX ?? process.env.QBO_SANDBOX) === 'true',
  }
}

export function getQBOBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
    : 'https://quickbooks.api.intuit.com/v3/company'
}

// ── OAuth ──────────────────────────────────────────────────────────────────────

export interface QBOTokens {
  access_token: string
  refresh_token: string
  expires_in: number       // seconds
  x_refresh_token_expires_in: number
  token_type: string
}

/** Exchange auth code for access + refresh tokens. */
export async function getQBOTokens(code: string): Promise<QBOTokens> {
  const config = getQBOConfig()
  const basic = btoa(`${config.clientId}:${config.clientSecret}`)

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`QBO token exchange failed: ${res.status} ${body}`)
  }

  return res.json() as Promise<QBOTokens>
}

/** Refresh an expired access token using the refresh token. */
export async function refreshQBOTokens(refreshToken: string): Promise<QBOTokens> {
  const config = getQBOConfig()
  const basic = btoa(`${config.clientId}:${config.clientSecret}`)

  const res = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`QBO token refresh failed: ${res.status} ${body}`)
  }

  return res.json() as Promise<QBOTokens>
}

// ── Authenticated request ──────────────────────────────────────────────────────

/**
 * Make an authenticated QBO API request for an org.
 * Lazy-refreshes the access token if it expires within 5 minutes.
 */
export async function qboRequest(
  orgId: string,
  method: string,
  path: string,     // relative to /v3/company/{realmId}
  body?: unknown
): Promise<Response> {
  const serviceClient = await createClient(true)

  const { data: conn, error } = await serviceClient
    .from('qbo_connections')
    .select('*')
    .eq('org_id', orgId)
    .single()

  if (error || !conn) throw new Error('QBO not connected for this org')

  const config = getQBOConfig()

  // Refresh if token expires within 5 minutes
  const expiresAt = new Date(conn.token_expires_at).getTime()
  const fiveMinutes = 5 * 60 * 1000
  let accessToken = conn.access_token

  if (Date.now() + fiveMinutes > expiresAt) {
    const tokens = await refreshQBOTokens(conn.refresh_token)
    accessToken = tokens.access_token

    await serviceClient
      .from('qbo_connections')
      .update({
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('org_id', orgId)
  }

  const baseUrl = getQBOBaseUrl(config.sandbox)
  const url = `${baseUrl}/${conn.realm_id}${path}?minorversion=65`

  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** Build the QBO OAuth authorization URL to redirect the user to. */
export function buildQBOAuthUrl(state: string): string {
  const config = getQBOConfig()
  const params = new URLSearchParams({
    client_id:     config.clientId,
    scope:         'com.intuit.quickbooks.accounting',
    redirect_uri:  config.redirectUri,
    response_type: 'code',
    access_type:   'offline',
    state,
  })
  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`
}
