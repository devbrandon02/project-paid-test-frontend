import type { CheckoutGateway } from '../../application/ports/checkoutGateway'
import type { CustomerDetails, PaymentCard, Product, Transaction } from '../../domain/checkout'

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('No pudimos conectarnos con la tienda. Revisa tu conexión e inténtalo de nuevo.')
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    const message = typeof payload === 'object' && payload !== null && 'message' in payload
      ? (payload as { message: string | string[] }).message
      : 'Ocurrió un error. Inténtalo nuevamente.'
    throw new Error(Array.isArray(message) ? message.join(' ') : message)
  }
  return response.json() as Promise<T>
}

export class HttpCheckoutGateway implements CheckoutGateway {
  getProducts(): Promise<Product[]> {
    return request<Product[]>('/products')
  }

  createTransaction(productId: string, customer: CustomerDetails): Promise<Transaction> {
    return request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify({ productId, ...customer }),
    })
  }

  processPayment(transactionId: string, card: PaymentCard): Promise<Transaction> {
    return request<Transaction>('/transactions/payment', {
      method: 'POST',
      body: JSON.stringify({ transactionId, ...card }),
    })
  }

  getTransaction(transactionId: string): Promise<Transaction> {
    return request<Transaction>(`/transactions/${encodeURIComponent(transactionId)}`)
  }
}

export function formatCop(amountInCents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(amountInCents / 100))
}
