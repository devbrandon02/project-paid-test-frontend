export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  imageUrl: string
}

export interface CustomerDetails {
  customerEmail: string
  customerFullName: string
  customerPhoneNumber: string
  deliveryAddress: string
  deliveryCity: string
  deliveryRegion: string
}

export interface PaymentCard {
  cardNumber: string
  cvc: string
  expMonth: number
  expYear: number
  cardHolder: string
}

export interface Transaction {
  id: string
  status: string
  amount: number
  baseFee: number
  deliveryFee: number
  reference: string
  wompiId?: string | null
  productId: string
}

export type CheckoutStep = 'catalog' | 'details' | 'summary' | 'result'

export interface PlaceOrderInput {
  productId: string
  customer: CustomerDetails
  card: PaymentCard
}
