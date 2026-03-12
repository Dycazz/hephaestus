/**
 * Pre-deploy environment variable validator.
 *
 * Cloudflare Workers does NOT automatically read .env.local — every variable
 * must be explicitly present in wrangler.jsonc (plaintext) or as a Cloudflare
 * secret (set once via `wrangler secret put`).
 *
 * This script catches mismatches before they become production outages.
 *
 * Run:  node scripts/check-deploy-env.mjs
 * Auto: runs before `npm run cf:deploy` via the predeploy hook
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ─── 1. Required plaintext vars (must be in wrangler.jsonc "vars") ──────────
const REQUIRED_PLAINTEXT = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

// ─── 2. Required secrets (must be set via `wrangler secret put`) ─────────────
//    We check these by calling `wrangler secret list` — needs auth.
const REQUIRED_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
]

// ─── 3. Validation rules ──────────────────────────────────────────────────────
const RULES = {
  NEXT_PUBLIC_APP_URL: (v) => {
    if (!v.startsWith('https://')) return 'Must start with https://'
    if (v.includes('workers.dev')) return `Points to workers.dev subdomain — should be your custom domain (e.g. https://hephaestus.work). Every deploy overwrites the Cloudflare dashboard value, so this MUST be correct in wrangler.jsonc.`
    return null
  },
  NEXT_PUBLIC_SUPABASE_URL: (v) => {
    if (!v.startsWith('https://') || !v.includes('.supabase.co')) return 'Must be a valid Supabase project URL'
    return null
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: (v) => {
    if (!v || v.length < 10) return 'Looks empty or too short'
    return null
  },
}

let hasError = false

function fail(msg) {
  console.error(`  ✗ ${msg}`)
  hasError = true
}

function ok(msg) {
  console.log(`  ✓ ${msg}`)
}

// ─── Check plaintext vars in wrangler.jsonc ──────────────────────────────────
console.log('\n🔍  Checking wrangler.jsonc plaintext vars…')
let wranglerConfig
try {
  // Strip // comment lines before parsing (JSONC format)
  // Filter line-by-line to avoid regex issues with non-ASCII chars in comments
  const raw = readFileSync(resolve(root, 'wrangler.jsonc'), 'utf8')
  const stripped = raw
    .split('\n')
    .map(line => (line.trim().startsWith('//') ? '' : line))
    .join('\n')
  wranglerConfig = JSON.parse(stripped)
} catch (e) {
  fail(`Could not parse wrangler.jsonc: ${e.message}`)
  process.exit(1)
}

const vars = wranglerConfig.vars ?? {}

for (const key of REQUIRED_PLAINTEXT) {
  if (!vars[key]) {
    fail(`${key} is missing from wrangler.jsonc "vars"`)
    continue
  }
  const rule = RULES[key]
  if (rule) {
    const err = rule(vars[key])
    if (err) {
      fail(`${key}: ${err}`)
    } else {
      ok(`${key} = ${vars[key]}`)
    }
  } else {
    ok(`${key} present`)
  }
}

// ─── Check secrets via wrangler CLI ──────────────────────────────────────────
console.log('\n🔍  Checking Cloudflare secrets…')
let secretNames = []
try {
  const raw = execSync('npx wrangler secret list --json 2>/dev/null', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  secretNames = JSON.parse(raw).map((s) => s.name)
} catch {
  console.warn('  ⚠️  Could not fetch secret list (not logged in?). Skipping secret check.')
}

if (secretNames.length > 0) {
  for (const key of REQUIRED_SECRETS) {
    if (!secretNames.includes(key)) {
      fail(`Secret "${key}" is not set. Run: npx wrangler secret put ${key}`)
    } else {
      ok(`Secret ${key} is set`)
    }
  }
}

// ─── Also warn about .env.local drift ────────────────────────────────────────
console.log('\n🔍  Checking .env.local for drift…')
let localEnv = {}
try {
  const raw = readFileSync(resolve(root, '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#')) localEnv[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.warn('  ⚠️  No .env.local found — skipping drift check')
}

for (const key of REQUIRED_PLAINTEXT) {
  if (localEnv[key] && vars[key] && localEnv[key] !== vars[key]) {
    // NEXT_PUBLIC_APP_URL is intentionally different (localhost vs production)
    if (key === 'NEXT_PUBLIC_APP_URL') continue
    console.warn(`  ⚠️  ${key} differs between .env.local and wrangler.jsonc — make sure this is intentional`)
    console.warn(`       .env.local  : ${localEnv[key]}`)
    console.warn(`       wrangler    : ${vars[key]}`)
  }
}

// ─── Result ───────────────────────────────────────────────────────────────────
console.log('')
if (hasError) {
  console.error('❌  Deploy check FAILED — fix the above issues before deploying.\n')
  process.exit(1)
} else {
  console.log('✅  All deploy checks passed.\n')
}
