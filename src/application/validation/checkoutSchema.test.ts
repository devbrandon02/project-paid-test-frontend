import { describe, expect, it } from 'vitest'
import { checkoutSchema, passesLuhn } from './checkoutSchema'

const validCheckout = {
  customerFullName: 'Ana García',
  customerEmail: 'ana@example.com',
  customerPhoneNumber: '300 123 4567',
  deliveryAddress: 'Calle 10 # 20-30',
  deliveryCity: 'Bogotá',
  deliveryRegion: 'Cundinamarca',
  cardHolder: 'ANA GARCIA',
  cardNumber: '4242424242424242',
  cvc: '123',
  expMonth: 12,
  expYear: (new Date().getFullYear() + 2) % 100,
}

describe('validación del checkout', () => {
  it('acepta tarjetas de prueba con checksum correcto', () => {
    expect(passesLuhn('4242424242424242')).toBe(true)
    expect(passesLuhn('5555555555554444')).toBe(true)
  })

  it('rechaza números incompletos o con checksum inválido', () => {
    expect(passesLuhn('424242')).toBe(false)
    expect(passesLuhn('4242424242424241')).toBe(false)
  })

  it('acepta los datos válidos del comprador y el pago', () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true)
  })

  it('rechaza correo, CVC y datos de entrega inválidos', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      customerEmail: 'no-es-correo',
      cvc: '1',
      deliveryAddress: 'abc',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(expect.arrayContaining(['customerEmail', 'cvc', 'deliveryAddress']))
    }
  })

  it('rechaza una tarjeta expirada', () => {
    const currentYear = new Date().getFullYear() % 100
    const result = checkoutSchema.safeParse({ ...validCheckout, expMonth: 1, expYear: currentYear - 1 })
    expect(result.success).toBe(false)
  })
})
