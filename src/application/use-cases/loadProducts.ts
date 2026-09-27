import type { CheckoutGateway } from '../ports/checkoutGateway'

export function loadProducts(gateway: CheckoutGateway) {
  return gateway.getProducts()
}
