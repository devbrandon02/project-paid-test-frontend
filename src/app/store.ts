import { configureStore } from '@reduxjs/toolkit'
import checkoutReducer, { createInitialCheckoutState } from '../features/checkout/checkoutSlice'
import { HttpCheckoutGateway } from '../infrastructure/api/HttpCheckoutGateway'
import { restoreCheckout, saveCheckout } from '../infrastructure/persistence/checkoutStorage'

const checkoutGateway = new HttpCheckoutGateway()
const savedCheckout = restoreCheckout()

export const store = configureStore({
  reducer: { checkout: checkoutReducer },
  preloadedState: {
    checkout: createInitialCheckoutState(savedCheckout),
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    thunk: { extraArgument: { checkoutGateway } },
  }),
})

store.subscribe(() => {
  const { selectedProductId, step, transaction } = store.getState().checkout
  saveCheckout({ selectedProductId, step, transaction })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
