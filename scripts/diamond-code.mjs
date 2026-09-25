#!/usr/bin/env node
/**
 * Prints the Diamond activation code for a request reference.
 *
 *   node scripts/diamond-code.mjs WRC-D7K3P9Q
 *
 * Run it once the member has paid; read them the code; they type it into the
 * Upgrade screen and Diamond opens. The code only works for that reference.
 *
 * Mirrors src/lib/activation.ts — same key, same HMAC, same alphabet — and so
 * does the n8n workflow in automation/n8n, which sends the code by itself.
 */
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

const reference = (process.argv[2] ?? '').trim().toUpperCase()
if (!/^WRC-D[0-9A-Z]{6}$/.test(reference)) {
  console.error('Usage: node scripts/diamond-code.mjs WRC-DXXXXXX')
  console.error('The reference is shown to the member on their Upgrade screen.')
  process.exit(1)
}

const { secret } = JSON.parse(
  readFileSync(new URL('../src/config/activation.json', import.meta.url), 'utf8'),
)

const signature = createHmac('sha256', secret).update(reference).digest()

let bits = 0
let value = 0
let code = ''
for (const byte of signature) {
  value = (value << 8) | byte
  bits += 8
  while (bits >= 5 && code.length < 8) {
    code += ALPHABET[(value >>> (bits - 5)) & 31]
    bits -= 5
  }
  if (code.length >= 8) break
}

console.log(`\n  Activation code for ${reference}:  ${code.slice(0, 4)}-${code.slice(4)}\n`)
