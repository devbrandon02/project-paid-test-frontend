import type { CheckoutStep, Transaction } from '../../domain/checkout'

const storageKey = 'womp-checkout'

export interface PersistedCheckout {
  selectedProductId: string | null
  step: CheckoutStep
  transaction: Transaction | null
}

const emptyCheckout: PersistedCheckout = {
  selectedProductId: null,
  step: 'catalog',
  transaction: null,
}

export function restoreCheckout(): PersistedCheckout {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return emptyCheckout
    const saved = JSON.parse(raw) as Partial<PersistedCheckout>
    const isResult = saved.step === 'result' && Boolean(saved.transaction)
    const isDetails = saved.step === 'details' && Boolean(saved.selectedProductId)
    return {
      selectedProductId: saved.selectedProductId ?? null,
      step: isResult ? 'result' : isDetails ? 'details' : 'catalog',
      transaction: isResult ? saved.transaction ?? null : null,
    }
  } catch {
    return emptyCheckout
  }
}

export function saveCheckout(checkout: PersistedCheckout): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(checkout))
  } catch {
    return
  }
}
