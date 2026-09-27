import type { CheckoutGateway } from '../ports/checkoutGateway'
import type { PlaceOrderInput, Transaction } from '../../domain/checkout'

export async function placeOrder(gateway: CheckoutGateway, input: PlaceOrderInput): Promise<Transaction> {
  const transaction = await gateway.createTransaction(input.productId, input.customer)
  try {
    return await gateway.processPayment(transaction.id, input.card)
  } catch {
    try {
      const currentTransaction = await gateway.getTransaction(transaction.id)
      if (currentTransaction.status !== 'PENDING') return currentTransaction
      return { ...currentTransaction, status: 'UNKNOWN' }
    } catch {
      return { ...transaction, status: 'UNKNOWN' }
    }
  }
}
