import { describe, expect, it } from 'vitest'
import { detectCardBrand } from './paymentCard'

describe('detectCardBrand', () => {
  it('detects Visa from its prefix', () => {
    expect(detectCardBrand('4')).toBe('visa')
    expect(detectCardBrand('4242 4242 4242 4242')).toBe('visa')
  })

  it('detects Mastercard legacy and 2-series prefixes', () => {
    expect(detectCardBrand('51')).toBe('mastercard')
    expect(detectCardBrand('2221 0000 0000 0000')).toBe('mastercard')
    expect(detectCardBrand('2720 0000 0000 0000')).toBe('mastercard')
  })

  it('does not classify unsupported or out-of-range prefixes', () => {
    expect(detectCardBrand('37')).toBeNull()
    expect(detectCardBrand('2220')).toBeNull()
    expect(detectCardBrand('2721')).toBeNull()
    expect(detectCardBrand('')).toBeNull()
  })
})
