import { beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCop, HttpCheckoutGateway } from './HttpCheckoutGateway'

const product = {
  id: 'p-1',
  name: 'Audífonos',
  description: 'Sonido nítido',
  price: 29900000,
  stock: 4,
  imageUrl: '/headphones.jpg',
}

const transaction = {
  id: 'tx-1',
  status: 'PENDING',
  amount: 29900000,
  baseFee: 200000,
  deliveryFee: 500000,
  reference: 'ref-1',
  productId: 'p-1',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('HttpCheckoutGateway', () => {
  const gateway = new HttpCheckoutGateway()
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('consulta el catálogo', async () => {
    fetchMock.mockResolvedValue(response([product]))
    await expect(gateway.getProducts()).resolves.toEqual([product])
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/products', expect.any(Object))
  })

  it('envía únicamente los datos necesarios para crear una transacción', async () => {
    fetchMock.mockResolvedValue(response(transaction))
    const customer = {
      customerEmail: 'ana@example.com',
      customerFullName: 'Ana García',
      customerPhoneNumber: '3001234567',
      deliveryAddress: 'Calle 10 # 20-30',
      deliveryCity: 'Bogotá',
      deliveryRegion: 'Cundinamarca',
    }
    await gateway.createTransaction('p-1', customer)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ productId: 'p-1', ...customer })
  })

  it('envía los datos de tarjeta al endpoint de pago sin almacenarlos', async () => {
    fetchMock.mockResolvedValue(response({ ...transaction, status: 'APPROVED' }))
    const card = { cardNumber: '4242424242424242', cvc: '123', expMonth: 12, expYear: 28, cardHolder: 'ANA GARCIA' }
    await gateway.processPayment('tx-1', card)
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/transactions/payment')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ transactionId: 'tx-1', ...card })
  })

  it('consulta una transacción usando su identificador codificado', async () => {
    fetchMock.mockResolvedValue(response(transaction))
    await gateway.getTransaction('tx/1')
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/transactions/tx%2F1')
  })

  it('convierte respuestas de error del backend en mensajes de usuario', async () => {
    fetchMock.mockResolvedValue(response({ message: 'Product not available' }, 400))
    await expect(gateway.getProducts()).rejects.toThrow('Product not available')
  })

  it('maneja errores de conexión', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'))
    await expect(gateway.getProducts()).rejects.toThrow('No pudimos conectarnos con la tienda')
  })

  it('formatea los valores de centavos como pesos colombianos', () => {
    expect(formatCop(29900000)).toContain('299.000')
  })
})
