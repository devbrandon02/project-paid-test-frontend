import { describe, expect, it } from 'vitest'
import { formatCop } from './formatCop'

describe('formatCop', () => {
  it('formats centavos as whole Colombian pesos', () => {
    expect(formatCop(29900000)).toContain('299.000')
    expect(formatCop(50000)).toContain('500')
  })

  it('rounds fractional peso values', () => {
    expect(formatCop(101)).toContain('1')
  })
})
