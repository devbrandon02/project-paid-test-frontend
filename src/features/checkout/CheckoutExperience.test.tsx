import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CheckoutGateway } from '../../application/ports/checkoutGateway'
import type { CheckoutState } from './checkoutSlice'
import checkoutReducer from './checkoutSlice'
import { CheckoutExperience } from './CheckoutExperience'

const product = {
  id: 'p-1',
  name: 'Audífonos de prueba',
  description: 'Sonido de alta definición.',
  price: 29900000,
  stock: 4,
  imageUrl: '/headphones.jpg',
}

const transaction = {
  id: 'tx-1',
  status: 'APPROVED',
  amount: 29900000,
  baseFee: 200000,
  deliveryFee: 500000,
  reference: 'ref-1',
  productId: 'p-1',
}

function createGateway(overrides: Partial<CheckoutGateway> = {}): CheckoutGateway {
  return {
    getProducts: vi.fn().mockResolvedValue([product]),
    createTransaction: vi.fn().mockResolvedValue({ ...transaction, status: 'PENDING' }),
    processPayment: vi.fn().mockResolvedValue(transaction),
    getTransaction: vi.fn().mockResolvedValue(transaction),
    ...overrides,
  }
}

function renderCheckout(gateway = createGateway(), savedState?: Partial<CheckoutState>) {
  const initialCheckoutState = { ...checkoutReducer(undefined, { type: '@@init' }), ...savedState }
  const store = configureStore({
    reducer: { checkout: checkoutReducer },
    preloadedState: { checkout: initialCheckoutState },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ thunk: { extraArgument: { checkoutGateway: gateway } } }),
  })
  return { gateway, store, ...render(<Provider store={store}><CheckoutExperience /></Provider>) }
}

async function fillCheckoutForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre completo'), 'Ana García')
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com')
  await user.type(screen.getByLabelText('Teléfono'), '3001234567')
  await user.type(screen.getByLabelText('Dirección'), 'Calle 10 # 20-30')
  await user.type(screen.getByLabelText('Ciudad'), 'Bogotá')
  await user.type(screen.getByLabelText('Departamento'), 'Cundinamarca')
  await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4242424242424242')
  await user.type(screen.getByLabelText('Nombre en la tarjeta'), 'ANA GARCIA')
  await user.type(screen.getByLabelText('Mes'), '12')
  await user.type(screen.getByLabelText('Año'), '28')
  await user.type(screen.getByLabelText('CVC'), '123')
}

describe('CheckoutExperience', () => {
  it('muestra el catálogo y bloquea el resumen si los datos no son válidos', async () => {
    const user = userEvent.setup()
    const { gateway } = renderCheckout()
    expect(await screen.findByRole('heading', { name: 'Audífonos de prueba' })).toBeInTheDocument()
    expect(screen.getByText('4 disponibles')).toBeInTheDocument()
    expect(gateway.getProducts).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Pagar con tarjeta' }))
    expect(screen.getByRole('dialog', { name: 'Entrega y pago' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revisar pedido' }))
    expect(await screen.findByText('Escribe tu nombre completo.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa un correo válido.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Resumen de compra' })).not.toBeInTheDocument()
  })

  it('detecta Visa al ingresar el número de tarjeta', async () => {
    const user = userEvent.setup()
    renderCheckout()
    await screen.findByRole('heading', { name: 'Audífonos de prueba' })
    await user.click(screen.getByRole('button', { name: 'Pagar con tarjeta' }))
    await user.type(screen.getByLabelText('Número de tarjeta'), '4242')
    expect(screen.getByText('Visa detectada')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Visa' })).toHaveClass('text-[#1434cb]')
  })

  it('detecta Mastercard al ingresar el número de tarjeta', async () => {
    const user = userEvent.setup()
    renderCheckout()
    await screen.findByRole('heading', { name: 'Audífonos de prueba' })
    await user.click(screen.getByRole('button', { name: 'Pagar con tarjeta' }))
    await user.type(screen.getByLabelText('Número de tarjeta'), '5555')
    expect(screen.getByText('Mastercard detectada')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mastercard' })).toHaveClass('opacity-100')
  })

  it('completa el pedido, procesa el pago y vuelve al catálogo', async () => {
    const user = userEvent.setup()
    const { gateway } = renderCheckout()
    await screen.findByRole('heading', { name: 'Audífonos de prueba' })
    await user.click(screen.getByRole('button', { name: 'Pagar con tarjeta' }))
    await fillCheckoutForm(user)
    await user.click(screen.getByRole('button', { name: 'Revisar pedido' }))

    expect(await screen.findByRole('heading', { name: 'Resumen de compra' })).toBeInTheDocument()
    expect(screen.getByText('Tarifa de servicio')).toBeInTheDocument()
    expect(screen.getByText('Envío')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /306\.000/ }))

    expect(await screen.findByRole('heading', { name: '¡Gracias por tu compra!' })).toBeInTheDocument()
    expect(screen.getByText('ref-1')).toBeInTheDocument()
    expect(gateway.createTransaction).toHaveBeenCalledOnce()
    expect(gateway.processPayment).toHaveBeenCalledWith('tx-1', expect.objectContaining({ cardNumber: '4242424242424242', cvc: '123' }))
    await user.click(screen.getByRole('button', { name: 'Volver a la tienda' }))
    expect(await screen.findByRole('heading', { name: 'Audífonos de prueba' })).toBeInTheDocument()
  })

  it('muestra y permite reintentar un error al cargar productos', async () => {
    const user = userEvent.setup()
    const gateway = createGateway({ getProducts: vi.fn().mockRejectedValueOnce(new Error('Servicio no disponible.')).mockResolvedValue([product]) })
    renderCheckout(gateway)
    expect(await screen.findByText('Servicio no disponible.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    expect(await screen.findByRole('heading', { name: 'Audífonos de prueba' })).toBeInTheDocument()
  })

  it('deshabilita la compra si el producto está agotado', async () => {
    const gateway = createGateway({ getProducts: vi.fn().mockResolvedValue([{ ...product, stock: 0 }]) })
    renderCheckout(gateway)
    expect(await screen.findByText('Agotado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pagar con tarjeta' })).toBeDisabled()
  })

  it('informa si el producto guardado dejó de estar disponible', async () => {
    renderCheckout(createGateway({ getProducts: vi.fn().mockResolvedValue([]) }), { selectedProductId: 'missing', step: 'details' })
    expect(await screen.findByRole('alert')).toHaveTextContent('El producto ya no está disponible.')
  })

  it('presenta el estado pendiente al recuperar una compra', async () => {
    renderCheckout(createGateway(), { step: 'result', transaction: { ...transaction, status: 'PENDING' } })
    expect(await screen.findByRole('heading', { name: 'Pago en proceso' })).toBeInTheDocument()
  })

  it('presenta el estado rechazado y el detalle de importes', async () => {
    renderCheckout(createGateway(), { step: 'result', transaction: { ...transaction, status: 'DECLINED' } })
    expect(await screen.findByRole('heading', { name: 'Pago no aprobado' })).toBeInTheDocument()
    expect(screen.getByText('Referencia')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })
})
