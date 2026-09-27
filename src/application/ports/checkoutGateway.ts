import type { CustomerDetails, PaymentCard, Product, Transaction } from '../../domain/checkout'

export interface CheckoutGateway {
  getProducts(): Promise<Product[]>
  createTransaction(productId: string, customer: CustomerDetails): Promise<Transaction>
  processPayment(transactionId: string, card: PaymentCard): Promise<Transaction>
  getTransaction(transactionId: string): Promise<Transaction>
}
