/**
 * The password on a device-only account.
 *
 * ── What this protects, and what it does not ────────────────────────────────
 * §13 forbids a backend in v1, so there is no server to check a password
 * against. What this gives is a **lock on this device**: someone who picks up
 * an unlocked phone finds the app asking for a password rather than showing a
 * net worth. What it cannot give is an account — nothing here is checked
 * anywhere else, and a determined person with the phone can read the database
 * directly. The screens say so in those words rather than letting anyone assume
 * otherwise.
 *
 * ── Why it is still worth hashing properly ──────────────────────────────────
 * Because people reuse passwords. Whatever is typed here is probably also on a
 * bank or an email account, so storing it in a readable form would turn a local
 * convenience into a way of leaking someone's real credential. PBKDF2 with a
 * per-account salt means the stored record cannot be read back into the
 * password, and cannot be attacked once for every account at a time.
 *
 * The password itself is never written anywhere: not to storage, not to a log,
 * not into the account record. Only `{ salt, hash, iterations }` is kept.
 */

const ITERATIONS = 120_000
const SALT_BYTES = 16
const KEY_BITS = 256

/** What is stored on the account. Never the password. */
export type Passcode = {
  /** Base64. Per account, so two people choosing the same password differ. */
  salt: string
  /** Base64 of the derived key. */
  hash: string
  /**
   * Recorded rather than assumed.
   *
   * Raising ITERATIONS later must not lock out everyone who signed up before
   * the change: verification uses the number the record was made with, and a
   * re-hash on the next successful sign-in can move it forward.
   */
  iterations: number
}

/** Short enough not to be a chore, long enough not to be a four-digit guess. */
export const MIN_PASSWORD_LENGTH = 6

/**
 * Whether a password can be set at all on this origin.
 *
 * `crypto.subtle` exists only in a secure context. The Android app (served from
 * localhost by Capacitor) and any https deploy both have it; a LAN preview over
 * plain `http://192.168.x.x` — the fast way to look at the app on a phone, see
 * RUN_ON_PHONE.md — does not. Rather than hand-rolling a weaker hash for that
 * one case, the screens check this and say plainly that a password cannot be
 * set or checked on this connection. Nothing is silently downgraded.
 */
export function isPasswordSupported(): boolean {
  return typeof globalThis.crypto?.subtle?.importKey === 'function'
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return toBase64(new Uint8Array(bits))
}

/** Hashes a new password. Throws where `isPasswordSupported()` is false. */
export async function createPasscode(password: string): Promise<Passcode> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  return {
    salt: toBase64(salt),
    hash: await derive(password, salt, ITERATIONS),
    iterations: ITERATIONS,
  }
}

/**
 * Compares two equal-length strings without returning early on the first
 * difference.
 *
 * The timing of a local comparison is not a realistic attack here — whoever can
 * measure it can also read the stored hash. It is written this way because the
 * habit is worth keeping: the day this moves to a server, the early-return
 * version would be a real leak and nobody would think to revisit it.
 */
function equalsInConstantTime(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

/** True when `password` is the one this passcode was made from. */
export async function verifyPasscode(password: string, stored: Passcode): Promise<boolean> {
  try {
    const candidate = await derive(password, fromBase64(stored.salt), stored.iterations)
    return equalsInConstantTime(candidate, stored.hash)
  } catch {
    /* A corrupt salt, or no subtle crypto. Either way: not a match, never a throw
       on the sign-in path. */
    return false
  }
}
