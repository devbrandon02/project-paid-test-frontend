import { beforeEach, describe, expect, it, vi } from 'vitest'
import { restoreCheckout, saveCheckout } from './checkoutStorage'

const paymentResult = {
  selectedProductId: 'p-1',
  step: 'result' as const,
  transaction: {
    id: 'tx-1',
    status: 'APPROVED',
    amount: 29900000,
    baseFee: 200000,
    deliveryFee: 500000,
    reference: 'ref-1',
    productId: 'p-1',
  },
}

describe('persistencia del checkout', () => {
  beforeEach(() => localStorage.clear())

  it('restaura el catálogo cuando no hay progreso guardado', () => {
    expect(restoreCheckout()).toEqual({ selectedProductId: null, step: 'catalog', transaction: null })
  })

  it('recupera el producto elegido y permite continuar en los datos', () => {
    localStorage.setItem('womp-checkout', JSON.stringify({ selectedProductId: 'p-1', step: 'details' }))
    expect(restoreCheckout()).toEqual({ selectedProductId: 'p-1', step: 'details', transaction: null })
  })

  it('recupera el resultado sin persistir datos de tarjeta', () => {
    saveCheckout(paymentResult)
    expect(restoreCheckout()).toEqual(paymentResult)
    expect(localStorage.getItem('womp-checkout')).not.toContain('cardNumber')
  })

  it('descarta un estado JSON dañado', () => {
    localStorage.setItem('womp-checkout', '{')
    expect(restoreCheckout().step).toBe('catalog')
  })

  it('continúa sin interrumpir la compra si el almacenamiento no está disponible', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => saveCheckout(paymentResult)).not.toThrow()
  })
})
