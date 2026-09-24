import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

import {
  activationCodeFor,
  checkActivationCode,
  newUpgradeReference,
  normaliseCode,
} from './activation'

describe('Diamond activation codes', () => {
  it('makes references in the shape the team is told to expect', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(newUpgradeReference()).toMatch(/^WRC-D[0-9A-HJKMNP-TV-Z]{6}$/)
    }
  })

  it('accepts the code for its own reference, however it is typed', async () => {
    const code = await activationCodeFor('WRC-D7K3P9Q')
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/)
    expect(await checkActivationCode('WRC-D7K3P9Q', code)).toBe(true)
    expect(await checkActivationCode('WRC-D7K3P9Q', code.toLowerCase().replace('-', ' '))).toBe(
      true,
    )
  })

  it('refuses a code made for somebody else’s request', async () => {
    const other = await activationCodeFor('WRC-DAAAAAA')
    expect(await checkActivationCode('WRC-D7K3P9Q', other)).toBe(false)
    expect(await checkActivationCode('WRC-D7K3P9Q', '')).toBe(false)
  })

  it('reads O as zero and I or L as one', () => {
    expect(normaliseCode('o1l-I')).toBe('0111')
  })

  it('matches the code the team’s script prints', async () => {
    const printed = execFileSync('node', ['scripts/diamond-code.mjs', 'WRC-D7K3P9Q'], {
      encoding: 'utf8',
    })
    expect(printed).toContain(await activationCodeFor('WRC-D7K3P9Q'))
  })
})
