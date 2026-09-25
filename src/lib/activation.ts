import activation from '@/config/activation.json'

/**
 * Diamond activation codes — how the WRC team approves an upgrade while there
 * is no server.
 *
 * ── The flow ────────────────────────────────────────────────────────────────
 *   1. A Silver member sends a Diamond request from the Upgrade screen. It gets
 *      a reference like WRC-D7K3P9Q.
 *   2. The team confirms the plan and payment with them. With the automation
 *      running (automation/README.md) they reply "PAID WRC-D7K3P9Q" on WhatsApp
 *      and n8n sends the member the code; by hand, they run
 *        node scripts/diamond-code.mjs WRC-D7K3P9Q
 *      and read them the eight-character code it prints.
 *   3. They type it in; the app checks it against their own reference and
 *      opens Diamond.
 *
 * A code is an HMAC of the reference, so it only works for the request it was
 * made for — a code shared between friends does nothing on a second phone.
 *
 * ── What this is not ────────────────────────────────────────────────────────
 * The key ships inside the app, as everything must when there is no server to
 * hold it. Somebody determined enough to pull the APK apart could mint codes.
 * That is an acceptable trade for an interim approval step, not for the long
 * run: once src/config/server.ts is set, the server should decide the tier and
 * this file should go.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32: no I, L, O, U

/** A request reference: WRC-D plus six characters nobody can misread. */
export function newUpgradeReference(): string {
  const bytes = new Uint8Array(6)
  globalThis.crypto.getRandomValues(bytes)
  let body = ''
  for (const byte of bytes) body += ALPHABET[byte % 32] ?? '0'
  return `WRC-D${body}`
}

/** "7kq2 m9xa", "7KQ2-M9XA" and "7KQ2M9XA" are the same code; so are O/0 and I/L/1. */
export function normaliseCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^0-9A-Z]/g, '')
}

function toBase32(bytes: Uint8Array, length: number): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5 && out.length < length) {
      out += ALPHABET[(value >>> (bits - 5)) & 31] ?? '0'
      bits -= 5
    }
    if (out.length >= length) break
  }
  return out
}

export function isActivationSupported(): boolean {
  return typeof globalThis.crypto?.subtle?.importKey === 'function'
}

/** The code for a reference, as XXXX-XXXX. Must match scripts/diamond-code.mjs exactly. */
export async function activationCodeFor(reference: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(activation.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(reference.trim().toUpperCase()),
  )
  const code = toBase32(new Uint8Array(signature), 8)
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

export async function checkActivationCode(reference: string, input: string): Promise<boolean> {
  if (!isActivationSupported()) return false
  const expected = normaliseCode(await activationCodeFor(reference))
  return normaliseCode(input) === expected
}
