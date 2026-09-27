import { Provider } from 'react-redux'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { store } from './app/store'

const product = {
  id: 'real-app-product',
  name: 'Producto del catálogo',
  description: 'Disponible para compra.',
  price: 1250000,
  stock: 3,
  imageUrl: '/product.jpg',
}

describe('App composition', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([product]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))
  })

  it('combines the application, Redux store and API gateway', async () => {
    render(<Provider store={store}><App /></Provider>)
    expect(await screen.findByRole('heading', { name: 'Producto del catálogo' })).toBeInTheDocument()
  })
})
