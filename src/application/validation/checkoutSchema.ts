import { z } from 'zod'

const digitsOnly = (value: string) => value.replace(/\D/g, '')

export function passesLuhn(value: string): boolean {
  const digits = digitsOnly(value)
  if (digits.length < 13 || digits.length > 19) return false

  let sum = 0
  let doubleDigit = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (doubleDigit) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    doubleDigit = !doubleDigit
  }
  return sum % 10 === 0
}

export const checkoutSchema = z.object({
  customerFullName: z.string().trim().min(3, 'Escribe tu nombre completo.'),
  customerEmail: z.string().trim().email('Ingresa un correo válido.'),
  customerPhoneNumber: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, 'Ingresa un teléfono válido.'),
  deliveryAddress: z.string().trim().min(6, 'Ingresa una dirección completa.'),
  deliveryCity: z.string().trim().min(2, 'Ingresa tu ciudad.'),
  deliveryRegion: z.string().trim().min(2, 'Ingresa tu departamento o región.'),
  cardHolder: z.string().trim().min(3, 'Escribe el nombre impreso en la tarjeta.'),
  cardNumber: z.string().refine(passesLuhn, 'Revisa el número de tarjeta.'),
  cvc: z.string().regex(/^\d{3,4}$/, 'El código debe tener 3 o 4 dígitos.'),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(new Date().getFullYear() % 100, 'La tarjeta está vencida.'),
}).superRefine((data, context) => {
  const currentYear = new Date().getFullYear() % 100
  const currentMonth = new Date().getMonth() + 1
  if (data.expYear === currentYear && data.expMonth < currentMonth) {
    context.addIssue({ code: 'custom', path: ['expMonth'], message: 'La tarjeta está vencida.' })
  }
})

export type CheckoutFormValues = z.infer<typeof checkoutSchema>
