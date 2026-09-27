import { describe, expect, it, vi } from 'vitest'
import type { CheckoutGateway } from '../ports/checkoutGateway'
import type { PlaceOrderInput, Transaction } from '../../domain/checkout'
import { placeOrder } from './placeOrder'

const transaction: Transaction = {
  id: 'tx-123',
  status: 'PENDING',
  amount: 29900000,
  baseFee: 200000,
  deliveryFee: 500000,
  reference: 'order-123',
  productId: 'product-123',
}

const order: PlaceOrderInput = {
  productId: 'product-123',
  customer: {
    customerFullName: 'Ana García',
    customerEmail: 'ana@example.com',
    customerPhoneNumber: '3001234567',
    deliveryAddress: 'Calle 10 # 20-30',
    deliveryCity: 'Bogotá',
    deliveryRegion: 'Cundinamarca',
  },
  card: { cardNumber: '4242424242424242', cvc: '123', expMonth: 12, expYear: 28, cardHolder: 'ANA GARCIA' },
}

function gateway(overrides: Partial<CheckoutGateway> = {}): CheckoutGateway {
  return {
    getProducts: vi.fn(),
    createTransaction: vi.fn().mockResolvedValue(transaction),
    processPayment: vi.fn().mockResolvedValue({ ...transaction, status: 'APPROVED' }),
    getTransaction: vi.fn(),
    ...overrides,
  }
}

describe('placeOrder', () => {
  it('crea la transacción antes de procesar el pago', async () => {
    const service = gateway()
    await expect(placeOrder(service, order)).resolves.toMatchObject({ id: 'tx-123', status: 'APPROVED' })
    expect(service.createTransaction).toHaveBeenCalledWith(order.productId, order.customer)
    expect(service.processPayment).toHaveBeenCalledWith('tx-123', order.card)
  })

  it('devuelve el estado final consultado después de un error de respuesta', async () => {
    const service = gateway({
      processPayment: vi.fn().mockRejectedValue(new Error('respuesta perdida')),
      getTransaction: vi.fn().mockResolvedValue({ ...transaction, status: 'DECLINED' }),
    })
    await expect(placeOrder(service, order)).resolves.toMatchObject({ status: 'DECLINED' })
  })

  it('marca el estado desconocido si el servidor sigue pendiente', async () => {
    const service = gateway({
      processPayment: vi.fn().mockRejectedValue(new Error('timeout')),
      getTransaction: vi.fn().mockResolvedValue(transaction),
    })
    await expect(placeOrder(service, order)).resolves.toMatchObject({ status: 'UNKNOWN' })
  })

  it('conserva la transacción si no se puede consultar el estado remoto', async () => {
    const service = gateway({
      processPayment: vi.fn().mockRejectedValue(new Error('timeout')),
      getTransaction: vi.fn().mockRejectedValue(new Error('offline')),
    })
    await expect(placeOrder(service, order)).resolves.toMatchObject({ id: transaction.id, status: 'UNKNOWN' })
  })
})
