import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { loadProducts as loadProductsUseCase } from '../../application/use-cases/loadProducts'
import { placeOrder } from '../../application/use-cases/placeOrder'
import type { Dependencies } from '../../application/ports/dependencies'
import type { CheckoutStep, PlaceOrderInput, Product, Transaction } from '../../domain/checkout'

export interface CheckoutState {
  products: Product[]
  selectedProductId: string | null
  step: CheckoutStep
  transaction: Transaction | null
  loadingProducts: boolean
  submittingOrder: boolean
  error: string | null
}

export const createInitialCheckoutState = (saved?: Pick<CheckoutState, 'selectedProductId' | 'step' | 'transaction'>): CheckoutState => ({
  products: [],
  selectedProductId: saved?.selectedProductId ?? null,
  step: saved?.step ?? 'catalog',
  transaction: saved?.transaction ?? null,
  loadingProducts: false,
  submittingOrder: false,
  error: null,
})

export const loadProducts = createAsyncThunk<Product[], void, { extra: Dependencies }>(
  'checkout/loadProducts',
  async (_, { extra }) => loadProductsUseCase(extra.checkoutGateway),
)

export const submitOrder = createAsyncThunk<Transaction, PlaceOrderInput, { extra: Dependencies }>(
  'checkout/submitOrder',
  async (input, { extra }) => placeOrder(extra.checkoutGateway, input),
)

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: createInitialCheckoutState(),
  reducers: {
    selectProduct(state, action: PayloadAction<string>) {
      state.selectedProductId = action.payload
      state.step = 'details'
      state.error = null
    },
    goToStep(state, action: PayloadAction<CheckoutStep>) {
      state.step = action.payload
      state.error = null
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload
    },
    clearError(state) {
      state.error = null
    },
    resetCheckout(state) {
      state.selectedProductId = null
      state.transaction = null
      state.step = 'catalog'
      state.error = null
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadProducts.pending, (state) => { state.loadingProducts = true; state.error = null })
      .addCase(loadProducts.fulfilled, (state, action) => { state.loadingProducts = false; state.products = action.payload })
      .addCase(loadProducts.rejected, (state, action) => { state.loadingProducts = false; state.error = action.error.message ?? 'No fue posible cargar los productos.' })
      .addCase(submitOrder.pending, (state) => { state.submittingOrder = true; state.error = null })
      .addCase(submitOrder.fulfilled, (state, action) => {
        state.submittingOrder = false
        state.transaction = action.payload
        state.step = 'result'
      })
      .addCase(submitOrder.rejected, (state, action) => {
        state.submittingOrder = false
        state.error = action.error.message ?? 'No fue posible completar el pago.'
      })
  },
})

export const { selectProduct, goToStep, setError, clearError, resetCheckout } = checkoutSlice.actions
export default checkoutSlice.reducer
