export type CardBrand = 'visa' | 'mastercard'

export function detectCardBrand(cardNumber: string): CardBrand | null {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.startsWith('4')) return 'visa'

  const prefixTwo = Number(digits.slice(0, 2))
  const prefixFour = Number(digits.slice(0, 4))
  if ((prefixTwo >= 51 && prefixTwo <= 55) || (digits.length >= 4 && prefixFour >= 2221 && prefixFour <= 2720)) {
    return 'mastercard'
  }

  return null
}
