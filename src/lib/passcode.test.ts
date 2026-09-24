import { describe, expect, it } from 'vitest'

import {
  MIN_PASSWORD_LENGTH,
  createPasscode,
  isPasswordSupported,
  verifyPasscode,
} from './passcode'

/**
 * The one property that matters: the stored record must not contain, or lead
 * back to, the password somebody typed.
 */

describe('the local passcode', () => {
  it('is supported in a secure context, which is what the app ships in', () => {
    expect(isPasswordSupported()).toBe(true)
  })

  it('accepts the password it was made from', async () => {
    const stored = await createPasscode('open sesame')
    await expect(verifyPasscode('open sesame', stored)).resolves.toBe(true)
  })

  it('rejects anything else, including a near miss and the empty string', async () => {
    const stored = await createPasscode('open sesame')
    for (const wrong of ['Open sesame', 'open sesam', 'open sesame ', '']) {
      await expect(verifyPasscode(wrong, stored)).resolves.toBe(false)
    }
  })

  it('never stores the password, in any field', async () => {
    const stored = await createPasscode('hunter2')
    expect(JSON.stringify(stored)).not.toContain('hunter2')
    expect(Object.values(stored)).not.toContain('hunter2')
  })

  it('salts per account, so the same password twice is two different records', async () => {
    const first = await createPasscode('same password')
    const second = await createPasscode('same password')
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
    /* Different records, both still correct. */
    await expect(verifyPasscode('same password', first)).resolves.toBe(true)
    await expect(verifyPasscode('same password', second)).resolves.toBe(true)
  })

  it('verifies at whatever cost the record was written with, not today’s', async () => {
    const stored = await createPasscode('portable')
    /* Simulates a record made before ITERATIONS was raised: the stored number is
       what must be used, or every older account is locked out by the upgrade. */
    const older = { ...stored, iterations: stored.iterations - 1 }
    await expect(verifyPasscode('portable', older)).resolves.toBe(false)
    await expect(verifyPasscode('portable', stored)).resolves.toBe(true)
  })

  it('returns false rather than throwing on a corrupt record', async () => {
    await expect(verifyPasscode('x', { salt: '!!!!', hash: '!!!!', iterations: 1 })).resolves.toBe(
      false,
    )
  })

  it('asks for a length somebody will actually remember', () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(6)
  })
})
