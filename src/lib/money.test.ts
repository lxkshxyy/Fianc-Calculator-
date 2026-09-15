import { describe, expect, it } from 'vitest'

import {
  EM_DASH,
  amountTone,
  formatCompact,
  formatFull,
  formatPercent,
  isRenderableAmount,
  parseAmount,
} from './money'

describe('formatCompact — the §12 required cases', () => {
  it.each([
    [0, '₹0'],
    [999.96, '₹1,000'], // promotes: rounds to 1000 before the unit is picked
    [1000, '₹1,000'],
    [99999, '₹99,999'],
    [100000, '₹1 L'],
    [9997000, '₹1 Cr'], // promotes across the crore boundary, never "₹100 L"
    [10000000, '₹1 Cr'],
  ])('formats %d as %s', (input, expected) => {
    expect(formatCompact(input)).toBe(expected)
  })

  it('renders a negative lakh figure with the sign outside the symbol', () => {
    expect(formatCompact(-1570000)).toBe('-₹15.7 L')
  })

  it('reports a negative tone so the caller can apply --danger (§4.2)', () => {
    expect(amountTone(-1570000)).toBe('negative')
  })
})

describe('formatCompact — band boundaries', () => {
  it.each([
    [850, '₹850'],
    [15400, '₹15,400'],
    [99949, '₹99,949'],
    [99999.6, '₹1 L'], // rounds up out of the plain band
    [150000, '₹1.5 L'],
    [1570000, '₹15.7 L'],
    [9994000, '₹99.9 L'], // just below the promotion threshold
    [9995000, '₹1 Cr'], // half-up at 99.95 L promotes
    [15700000, '₹1.57 Cr'],
    [1234500000, '₹123.45 Cr'],
  ])('formats %d as %s', (input, expected) => {
    expect(formatCompact(input)).toBe(expected)
  })

  it('drops a trailing .0 rather than printing "₹15.0 L"', () => {
    expect(formatCompact(1500000)).toBe('₹15 L')
    expect(formatCompact(20000000)).toBe('₹2 Cr')
  })

  it('uses Indian grouping, not thousands grouping', () => {
    expect(formatFull(1570000)).toBe('₹15,70,000')
    expect(formatFull(100000)).toBe('₹1,00,000')
  })
})

describe('non-finite and missing values never throw (§2.1.7)', () => {
  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'renders %s as an em dash',
    (input) => {
      expect(formatCompact(input)).toBe(EM_DASH)
      expect(formatFull(input)).toBe(EM_DASH)
      expect(formatPercent(input)).toBe(EM_DASH)
      expect(amountTone(input)).toBe('unknown')
      expect(isRenderableAmount(input)).toBe(false)
    },
  )

  it('never emits NaN or Infinity in a rendered string', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 0 / 0, 1 / 0]) {
      expect(formatCompact(value)).not.toMatch(/NaN|Infinity/)
    }
  })
})

describe('formatPercent — takes a ratio, not a percentage', () => {
  it.each([
    [0.29, '29%'],
    [0, '0%'],
    [1, '100%'],
    [-0.05, '-5%'],
  ])('formats the ratio %d as %s', (input, expected) => {
    expect(formatPercent(input)).toBe(expected)
  })

  it('honours a requested decimal place', () => {
    expect(formatPercent(0.2947, 1)).toBe('29.5%')
  })

  it('renders the null savings rate of a zero-income household as an em dash (§8.4)', () => {
    expect(formatPercent(null)).toBe(EM_DASH)
  })
})

describe('parseAmount — the §12 required forms', () => {
  it.each([
    ['15k', 15000],
    ['15K', 15000],
    ['1.5l', 150000],
    ['1.5L', 150000],
    ['2cr', 20000000],
    ['2 Cr', 20000000],
    ['15,000', 15000],
    ['₹15000', 15000],
  ])('parses %s as %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each([
    ['₹15,70,000', 1570000],
    ['  85000  ', 85000],
    ['2 crore', 20000000],
    ['3 lakh', 300000],
    ['1.5 lakhs', 150000],
    ['2 lac', 200000],
    ['0', 0],
    ['-5000', -5000],
  ])('also parses %s as %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })
})

describe('parseAmount — garbage returns null, never 0', () => {
  it.each([
    '',
    '   ',
    'abc',
    'rent',
    '15kk',
    'k15',
    '--5',
    '1.2.3',
    '₹',
    '15 rupees',
    'NaN',
    'Infinity',
    '1e5',
  ])('rejects %s', (input) => {
    const result = parseAmount(input)
    expect(result).toBeNull()
    expect(result).not.toBe(0)
  })

  it('distinguishes a rejected input from a genuine zero', () => {
    expect(parseAmount('garbage')).toBeNull()
    expect(parseAmount('0')).toBe(0)
  })
})

describe('round-trip', () => {
  it.each([0, 850, 15400, 99999, 100000, 1570000, 9997000, 10000000])(
    'parses back what formatFull produced for %d',
    (value) => {
      expect(parseAmount(formatFull(value))).toBe(value)
    },
  )
})
