import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShoppingBag, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { clearError, goToStep, loadProducts, resetCheckout, selectProduct, submitOrder } from './checkoutSlice'
import { checkoutSchema } from '../../application/validation/checkoutSchema'
import type { CheckoutFormValues } from '../../application/validation/checkoutSchema'
import type { CheckoutStep, Product, Transaction } from '../../domain/checkout'
import { detectCardBrand } from '../../domain/paymentCard'
import { formatCop } from '../../presentation/formatters/formatCop'
import './checkout.css'

const baseFee = 200000
const deliveryFee = 500000
const digitsOnly = (value: string) => value.replace(/\D/g, '')

const emptyForm: CheckoutFormValues = {
  customerFullName: '',
  customerEmail: '',
  customerPhoneNumber: '',
  deliveryAddress: '',
  deliveryCity: '',
  deliveryRegion: '',
  cardHolder: '',
  cardNumber: '',
  cvc: '',
  expMonth: 0,
  expYear: 0,
}

function formatCardNumber(value: string) {
  return digitsOnly(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
}

function Stepper({ step }: { step: CheckoutStep }) {
  const current = step === 'catalog' ? 1 : step === 'details' ? 2 : 3
  const labels = ['Producto', 'Datos', 'Pago']
  return (
    <ol className="stepper" aria-label="Progreso de compra">
      {labels.map((label, index) => (
        <li className={index + 1 <= current ? 'stepper__item is-active' : 'stepper__item'} key={label}>
          <span className="stepper__number">{index + 1 < current ? <Check size={14} /> : index + 1}</span>
          <span>{label}</span>
          {index < labels.length - 1 && <span className="stepper__line" />}
        </li>
      ))}
    </ol>
  )
}

function ProductCard({ product, onBuy }: { product: Product; onBuy: (id: string) => void }) {
  return (
    <article className="product-card card">
      <div className="product-card__image-wrap">
        <img className="product-card__image" src={product.imageUrl} alt={product.name} loading="lazy" />
      </div>
      <div className="product-card__content">
        <h2>{product.name}</h2>
        <p className="product-card__description">{product.description}</p>
        <div className="product-card__bottom">
          <div className="product-card__meta">
            <p className="product-price">{formatCop(product.price)}</p>
            <span className={product.stock > 0 ? 'stock-label' : 'stock-label stock-label--empty'}>
              {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
            </span>
          </div>
          <button className="btn btn-primary !text-white hover:!bg-[#285643] active:!bg-[#214634] w-full" type="button" onClick={() => onBuy(product.id)} disabled={product.stock <= 0}>
            Pagar con tarjeta
          </button>
        </div>
      </div>
    </article>
  )
}

function Field({ label, name, value, onChange, error, wide, ...props }: {
  label: string
  name: keyof CheckoutFormValues
  value: string | number
  onChange: (name: keyof CheckoutFormValues, value: string | number) => void
  error?: string
  wide?: boolean
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'search' | 'url' | 'none'
  maxLength?: number
  required?: boolean
}) {
  return (
    <label className={wide ? 'fieldset col-span-full gap-1' : 'fieldset gap-1'}>
      <span className="fieldset-legend p-0 text-xs font-medium text-base-content/80">{label}</span>
      <input
        className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
        name={name}
        value={value || ''}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && <span className="text-xs text-error" id={`${name}-error`}>{error}</span>}
    </label>
  )
}

function DetailsDialog({
  values,
  onChange,
  onContinue,
  onClose,
}: {
  values: CheckoutFormValues
  onChange: (name: keyof CheckoutFormValues, value: string | number) => void
  onContinue: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormValues, string>>>({})
  const cardBrand = detectCardBrand(values.cardNumber)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = checkoutSchema.safeParse({
      ...values,
      cardNumber: digitsOnly(values.cardNumber),
      cvc: digitsOnly(values.cvc),
      expMonth: Number(values.expMonth),
      expYear: Number(values.expYear),
    })
    if (!result.success) {
      const nextErrors: Partial<Record<keyof CheckoutFormValues, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof CheckoutFormValues
        nextErrors[key] ??= issue.message
      }
      setErrors(nextErrors)
      return
    }
    setErrors({})
    onContinue(event)
  }

  const change = (name: keyof CheckoutFormValues, value: string | number) => {
    setErrors((current) => ({ ...current, [name]: undefined }))
    onChange(name, value)
  }

  return (
    <div className="modal modal-open items-end p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-box max-h-[95dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-base-100 p-5 shadow-xl sm:rounded-lg sm:p-7" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl" id="details-title">Entrega y pago</h2>
          </div>
          <button className="btn btn-ghost btn-circle btn-sm" type="button" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="mb-5 text-sm text-base-content/70">Indica dónde entregar el pedido y los datos de la tarjeta.</p>
        <form className="space-y-5" onSubmit={submit} noValidate>
          <section>
            <h3 className="font-display mb-3 text-sm font-semibold">Entrega</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <Field label="Nombre completo" name="customerFullName" value={values.customerFullName} onChange={change} error={errors.customerFullName} autoComplete="name" placeholder="Ej. Ana García" wide required />
              <Field label="Correo electrónico" name="customerEmail" value={values.customerEmail} onChange={change} error={errors.customerEmail} type="email" autoComplete="email" placeholder="ana@correo.com" required />
              <Field label="Teléfono" name="customerPhoneNumber" value={values.customerPhoneNumber} onChange={change} error={errors.customerPhoneNumber} type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" required />
              <Field label="Dirección" name="deliveryAddress" value={values.deliveryAddress} onChange={change} error={errors.deliveryAddress} autoComplete="street-address" placeholder="Calle 00 # 00 - 00" wide required />
              <Field label="Ciudad" name="deliveryCity" value={values.deliveryCity} onChange={change} error={errors.deliveryCity} autoComplete="address-level2" placeholder="Bogotá" required />
              <Field label="Departamento" name="deliveryRegion" value={values.deliveryRegion} onChange={change} error={errors.deliveryRegion} autoComplete="address-level1" placeholder="Cundinamarca" required />
            </div>
          </section>
          <section className="card border border-base-300 bg-base-100 shadow-none">
            <div className="card-body gap-4 p-4 sm:p-5">
              <h3 className="font-display text-sm font-semibold">Tarjeta de crédito</h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <div className="fieldset col-span-full gap-1">
                  <div className="fieldset-legend flex w-full items-center justify-between p-0 text-xs font-medium text-base-content/80">
                    <label htmlFor="cardNumber">Número de tarjeta</label>
                    <div className="flex items-center gap-3" aria-label="Visa y Mastercard">
                      <span className={`text-base font-extrabold italic tracking-tight ${cardBrand === 'visa' ? 'text-[#1434cb]' : 'text-base-content/30'}`} role="img" aria-label="Visa">VISA</span>
                      <svg className={cardBrand === 'mastercard' ? 'h-5 w-7 opacity-100' : 'h-5 w-7 opacity-35'} role="img" aria-label="Mastercard" viewBox="0 0 40 26">
                      <circle cx="15" cy="13" r="11" fill="#eb001b" />
                      <circle cx="25" cy="13" r="11" fill="#f79e1b" fillOpacity=".92" />
                      </svg>
                    </div>
                  </div>
                  <input className={`input input-bordered w-full ${errors.cardNumber ? 'input-error' : ''}`} id="cardNumber" name="cardNumber" value={values.cardNumber} onChange={(event) => change('cardNumber', formatCardNumber(event.target.value))} aria-invalid={Boolean(errors.cardNumber)} aria-describedby={errors.cardNumber ? 'cardNumber-error' : undefined} autoComplete="cc-number" inputMode="numeric" placeholder="0000 0000 0000 0000" maxLength={23} required />
                  {errors.cardNumber && <span className="text-xs text-error" id="cardNumber-error">{errors.cardNumber}</span>}
                  {cardBrand && <span className="text-xs text-base-content/60" aria-live="polite">{cardBrand === 'visa' ? 'Visa' : 'Mastercard'} detectada</span>}
                </div>
                <Field label="Nombre en la tarjeta" name="cardHolder" value={values.cardHolder} onChange={change} error={errors.cardHolder} autoComplete="cc-name" placeholder="Como aparece en la tarjeta" wide required />
                <div className="col-span-full grid grid-cols-3 gap-2">
                  <Field label="Mes" name="expMonth" value={values.expMonth || ''} onChange={(name, value) => change(name, value ? Number(value) : 0)} error={errors.expMonth} inputMode="numeric" placeholder="MM" maxLength={2} autoComplete="cc-exp-month" required />
                  <Field label="Año" name="expYear" value={values.expYear || ''} onChange={(name, value) => change(name, value ? Number(value) : 0)} error={errors.expYear} inputMode="numeric" placeholder="AA" maxLength={2} autoComplete="cc-exp-year" required />
                  <Field label="CVC" name="cvc" value={values.cvc} onChange={(name, value) => change(name, digitsOnly(String(value)).slice(0, 4))} error={errors.cvc} inputMode="numeric" placeholder="123" maxLength={4} autoComplete="cc-csc" required />
                </div>
              </div>
            </div>
          </section>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button className="btn btn-ghost" type="button" onClick={onClose}><ArrowLeft size={16} /> Volver</button>
            <button className="btn btn-primary !text-white hover:!bg-[#285643] active:!bg-[#214634]" type="submit">Revisar pedido <ArrowRight size={16} /></button>
          </div>
          <p className="flex items-center justify-center gap-2 text-center text-xs text-base-content/60"><LockKeyhole size={13} /> Tus datos de tarjeta se usan solo para este pago y no se guardan.</p>
        </form>
      </section>
    </div>
  )
}

function SummaryPanel({ product, onBack, onPay, busy, error }: {
  product: Product
  onBack: () => void
  onPay: () => void
  busy: boolean
  error: string | null
}) {
  return (
    <div className="modal modal-open items-end p-0 sm:items-stretch sm:justify-end">
      <section className="modal-box max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-base-100 p-5 sm:my-0 sm:h-full sm:max-h-none sm:rounded-none sm:p-7" aria-labelledby="summary-title">
        <div className="mb-5 border-b border-base-300 pb-4">
          <p className="mb-1 text-xs font-medium text-base-content/60">PASO 3 DE 3</p>
          <h2 className="font-display text-xl font-semibold tracking-tight" id="summary-title">Resumen de compra</h2>
        </div>
        <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3 border-b border-base-300 py-4">
          <img className="h-14 w-14 object-cover" src={product.imageUrl} alt="" />
          <div><p className="mb-1 text-sm font-semibold">{product.name}</p><span className="text-xs text-base-content/60">1 unidad</span></div>
          <strong className="text-sm">{formatCop(product.price)}</strong>
        </div>
        <div className="space-y-3 py-5 text-sm text-base-content/75">
          <div className="flex justify-between gap-3"><span>Producto</span><span>{formatCop(product.price)}</span></div>
          <div className="flex justify-between gap-3"><span>Tarifa de servicio</span><span>{formatCop(baseFee)}</span></div>
          <div className="flex justify-between gap-3"><span>Envío</span><span>{formatCop(deliveryFee)}</span></div>
        </div>
        <div className="flex justify-between border-t border-base-300 py-4 text-sm font-semibold"><span>Total a pagar</span><strong className="text-lg">{formatCop(product.price + baseFee + deliveryFee)}</strong></div>
        {error && <div className="alert alert-error mt-2 text-sm" role="alert">{error}</div>}
        <button className="btn btn-primary !text-white hover:!bg-[#285643] active:!bg-[#214634] mt-4 w-full" type="button" onClick={onPay} disabled={busy}>
          {busy ? <><span className="spinner" /> Procesando pago...</> : <>Pagar {formatCop(product.price + baseFee + deliveryFee)} <ArrowRight size={17} /></>}
        </button>
        <button className="btn btn-ghost mt-2 w-full" type="button" onClick={onBack} disabled={busy}><ArrowLeft size={15} /> Volver a mis datos</button>
      </section>
    </div>
  )
}

function PaymentResult({ transaction, product, onContinue }: { transaction: Transaction; product?: Product; onContinue: () => void }) {
  const { status, reference, amount, baseFee, deliveryFee } = transaction
  const isApproved = status === 'APPROVED'
  const isPending = status === 'PENDING' || status === 'UNKNOWN'
  const heading = isApproved ? '¡Gracias por tu compra!' : isPending ? 'Pago en proceso' : 'Pago no aprobado'
  const detail = isApproved
    ? 'El pago fue aprobado. Guarda la referencia para cualquier consulta.'
    : isPending
      ? 'El banco aún está confirmando la transacción. Conserva la referencia para consultar el estado.'
      : 'La transacción fue rechazada. Puedes volver al catálogo e intentarlo de nuevo.'
  const statusLabel = isApproved ? 'Aprobado' : isPending ? 'Pendiente' : 'Rechazado'
  const statusColor = isApproved ? 'bg-emerald-600' : isPending ? 'bg-amber-500' : 'bg-rose-600'

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-3 py-8 sm:px-0">
      <div className="mb-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-base-content/70"><span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />{statusLabel}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
        <p className="mt-2 text-sm leading-6 text-base-content/70">{detail}</p>
      </div>
      <section className="card border border-base-300 bg-base-100 shadow-none" aria-label="Detalle del pago">
        <div className="card-body gap-4 p-5">
          <h2 className="font-display text-sm font-semibold">Detalle del pedido</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-base-content/70">{product?.name ?? 'Producto'}</span><span>{formatCop(amount)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-base-content/70">Tarifa de servicio</span><span>{formatCop(baseFee)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-base-content/70">Envío</span><span>{formatCop(deliveryFee)}</span></div>
          </div>
          <div className="flex justify-between border-t border-base-300 pt-4 text-sm font-semibold"><span>Total</span><span>{formatCop(amount + baseFee + deliveryFee)}</span></div>
          <div className="border-t border-base-300 pt-4">
            <p className="mb-1 text-xs text-base-content/60">Referencia</p>
            <p className="break-all font-mono text-sm">{reference || transaction.id}</p>
          </div>
        </div>
      </section>
      <button className="btn btn-primary !text-white hover:!bg-[#285643] active:!bg-[#214634] mt-5 w-full" type="button" onClick={onContinue}><ShoppingBag size={17} /> Volver a la tienda</button>
    </main>
  )
}

export function CheckoutExperience() {
  const dispatch = useAppDispatch()
  const { products, selectedProductId, step, transaction, loadingProducts, submittingOrder, error } = useAppSelector((state) => state.checkout)
  const [formValues, setFormValues] = useState<CheckoutFormValues>(emptyForm)
  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId), [products, selectedProductId])

  useEffect(() => {
    void dispatch(loadProducts())
  }, [dispatch])

  const changeForm = (name: keyof CheckoutFormValues, value: string | number) => {
    setFormValues((current) => ({ ...current, [name]: value }))
    if (error) dispatch(clearError())
  }

  const continueToSummary = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    dispatch(goToStep('summary'))
  }

  const makePayment = async () => {
    if (!selectedProduct) return
    await dispatch(submitOrder({
      productId: selectedProduct.id,
      customer: {
        customerFullName: formValues.customerFullName.trim(),
        customerEmail: formValues.customerEmail.trim(),
        customerPhoneNumber: formValues.customerPhoneNumber.trim(),
        deliveryAddress: formValues.deliveryAddress.trim(),
        deliveryCity: formValues.deliveryCity.trim(),
        deliveryRegion: formValues.deliveryRegion.trim(),
      },
      card: {
        cardNumber: digitsOnly(formValues.cardNumber),
        cvc: digitsOnly(formValues.cvc),
        expMonth: Number(formValues.expMonth),
        expYear: Number(formValues.expYear),
        cardHolder: formValues.cardHolder.trim(),
      },
    }))
    setFormValues(emptyForm)
  }

  const returnToCatalog = () => {
    setFormValues(emptyForm)
    dispatch(resetCheckout())
    void dispatch(loadProducts())
  }

  const closeDialog = () => {
    dispatch(goToStep('catalog'))
    dispatch(clearError())
  }

  if (step === 'result' && transaction) {
    return <div className="app-shell"><Header /><Stepper step={step} /><PaymentResult transaction={transaction} product={selectedProduct} onContinue={returnToCatalog} /></div>
  }

  return (
    <div className="app-shell">
      <Header />
      <Stepper step={step} />
      <main>
        <section className="catalog-section" id="productos" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div><h1 id="catalog-title">Productos</h1><p>Elige un producto para continuar con tu compra.</p></div>
            <span className="collection-count">{products.length} productos</span>
          </div>
          {loadingProducts && products.length === 0 ? (
            <div className="loading-state"><span className="spinner spinner--dark" /><span>Cargando productos</span></div>
          ) : error && products.length === 0 ? (
            <div className="empty-state"><p>{error}</p><button className="btn btn-outline" type="button" onClick={() => void dispatch(loadProducts())}>Intentar de nuevo</button></div>
          ) : products.length === 0 ? (
            <div className="empty-state"><p>Por ahora no hay productos disponibles.</p></div>
          ) : (
            <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onBuy={(id) => { dispatch(selectProduct(id)); dispatch(clearError()) }} />)}</div>
          )}
        </section>

      </main>
      {step === 'details' && selectedProduct && <DetailsDialog values={formValues} onChange={changeForm} onContinue={continueToSummary} onClose={closeDialog} />}
      {step === 'summary' && selectedProduct && <SummaryPanel product={selectedProduct} onBack={() => dispatch(goToStep('details'))} onPay={() => void makePayment()} busy={submittingOrder} error={error} />}
      {step === 'details' && !selectedProduct && <div className="toast-error" role="alert">El producto ya no está disponible. <button type="button" onClick={closeDialog}>Cerrar</button></div>}
    </div>
  )
}

function Header() {
  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.checkout.step)
  const openCatalog = () => {
    if (step !== 'catalog' && step !== 'result') dispatch(goToStep('catalog'))
  }
  return (
    <header className="site-header">
      <button className="brand" type="button" onClick={openCatalog} aria-label="Ir al inicio">
        <span>womp</span>
      </button>
    </header>
  )
}
