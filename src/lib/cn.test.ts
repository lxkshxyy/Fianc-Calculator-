import { describe, expect, it } from 'vitest'

import { cn } from './cn'

/**
 * The regression this file exists for: a size class deleting a colour class.
 *
 * tailwind-merge files an unrecognised `text-*` as a font size, and this app's
 * colours and its type scale are both unrecognised by default — so they shared
 * a group and cancelled. The symptom was a primary button with no colour on its
 * label: near-black text on a dark green fill, on the one control every screen
 * puts its main action in.
 */

describe('cn', () => {
  it('keeps a colour and a size together, in either order', () => {
    expect(cn('text-on-gold', 'text-base')).toContain('text-on-gold')
    expect(cn('text-caption', 'text-on-gold')).toContain('text-caption')
    expect(cn('text-body', 'text-accent')).toBe('text-body text-accent')
  })

  it('still resolves a real conflict, last one winning', () => {
    expect(cn('text-body', 'text-lead')).toBe('text-lead')
    expect(cn('text-accent', 'text-danger')).toBe('text-danger')
    expect(cn('bg-surface', 'bg-surface-2')).toBe('bg-surface-2')
  })

  it('leaves everything unrelated alone', () => {
    expect(cn('flex items-center', 'gap-2')).toBe('flex items-center gap-2')
  })
})
