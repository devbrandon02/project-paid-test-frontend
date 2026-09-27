import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, MapPin, PackageCheck, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { clearError, goToStep, loadProducts, resetCheckout, selectProduct, submitOrder } from './checkoutSlice'
import { checkoutSchema } from '../../application/validation/checkoutSchema'
import type { CheckoutFormValues } from '../../application/validation/checkoutSchema'
import type { CheckoutStep, Product } from '../../domain/checkout'
import { formatCop } from '../../infrastructure/api/HttpCheckoutGateway'
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

function cardBrand(value: string) {
  const digits = digitsOnly(value)
  if (/^4/.test(digits)) return 'VISA'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD'
  return 'TARJETA'
}

function Stepper({ step }: { step: CheckoutStep }) {
  const current = step === 'catalog' || step === 'result' ? 1 : step === 'details' ? 2 : 3
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
        <span className={product.stock > 0 ? 'stock-pill badge' : 'stock-pill badge stock-pill--empty'}>
          <span className="stock-pill__dot" />{product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
        </span>
      </div>
      <div className="product-card__content">
        <p className="eyebrow">DISEÑO PARA DISFRUTAR</p>
        <h2>{product.name}</h2>
        <p className="product-card__description">{product.description}</p>
        <div className="product-card__bottom">
          <div>
            <span className="price-caption">Precio</span>
            <p className="product-price">{formatCop(product.price)}</p>
          </div>
          <button className="button btn btn-primary button--primary" type="button" onClick={() => onBuy(product.id)} disabled={product.stock <= 0}>
            <CreditCard size={17} /> Comprar
          </button>
        </div>
      </div>
    </article>
  )
}

function Field({ label, name, value, onChange, error, ...props }: {
  label: string
  name: keyof CheckoutFormValues
  value: string | number
  onChange: (name: keyof CheckoutFormValues, value: string | number) => void
  error?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'email' | 'tel' | 'search' | 'url' | 'none'
  maxLength?: number
  required?: boolean
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
      className="input input-bordered"
        name={name}
        value={value || ''}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && <span className="field__error" id={`${name}-error`}>{error}</span>}
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
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div className="dialog__top">
          <div>
            <p className="eyebrow">PAGO SEGURO · PASO 2 DE 3</p>
            <h2 id="details-title">¿A dónde lo enviamos?</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
        </div>
        <p className="dialog__intro">Completa tus datos de entrega y tarjeta para revisar el pedido.</p>
        <form onSubmit={submit} noValidate>
          <div className="form-section">
            <h3><MapPin size={16} /> Datos de entrega</h3>
            <div className="form-grid">
              <Field label="Nombre completo" name="customerFullName" value={values.customerFullName} onChange={change} error={errors.customerFullName} autoComplete="name" placeholder="Ej. Ana García" required />
              <Field label="Correo electrónico" name="customerEmail" value={values.customerEmail} onChange={change} error={errors.customerEmail} type="email" autoComplete="email" placeholder="ana@correo.com" required />
              <Field label="Teléfono" name="customerPhoneNumber" value={values.customerPhoneNumber} onChange={change} error={errors.customerPhoneNumber} type="tel" inputMode="tel" autoComplete="tel" placeholder="300 123 4567" required />
              <Field label="Dirección" name="deliveryAddress" value={values.deliveryAddress} onChange={change} error={errors.deliveryAddress} autoComplete="street-address" placeholder="Calle 00 # 00 - 00" required />
              <Field label="Ciudad" name="deliveryCity" value={values.deliveryCity} onChange={change} error={errors.deliveryCity} autoComplete="address-level2" placeholder="Bogotá" required />
              <Field label="Departamento" name="deliveryRegion" value={values.deliveryRegion} onChange={change} error={errors.deliveryRegion} autoComplete="address-level1" placeholder="Cundinamarca" required />
            </div>
          </div>
          <div className="form-section">
            <h3><CreditCard size={16} /> Tarjeta de crédito</h3>
            <div className="form-grid">
              <div className="field field--wide">
                <div className="field__label-row"><span className="field__label">Número de tarjeta</span><span className="card-brands"><span className={cardBrand(values.cardNumber) === 'VISA' ? 'card-brand is-detected' : 'card-brand'}>VISA</span><span className={cardBrand(values.cardNumber) === 'MASTERCARD' ? 'card-brand is-detected' : 'card-brand'}>MC</span></span></div>
                <input className="input input-bordered" name="cardNumber" value={values.cardNumber} onChange={(event) => change('cardNumber', formatCardNumber(event.target.value))} aria-invalid={Boolean(errors.cardNumber)} aria-describedby={errors.cardNumber ? 'cardNumber-error' : undefined} autoComplete="cc-number" inputMode="numeric" placeholder="0000 0000 0000 0000" maxLength={23} required />
                {errors.cardNumber && <span className="field__error" id="cardNumber-error">{errors.cardNumber}</span>}
              </div>
              <Field label="Nombre en la tarjeta" name="cardHolder" value={values.cardHolder} onChange={change} error={errors.cardHolder} autoComplete="cc-name" placeholder="Como aparece en la tarjeta" required />
              <div className="form-grid form-grid--nested">
                <Field label="Mes" name="expMonth" value={values.expMonth || ''} onChange={(name, value) => change(name, value ? Number(value) : 0)} error={errors.expMonth} inputMode="numeric" placeholder="MM" maxLength={2} autoComplete="cc-exp-month" required />
                <Field label="Año" name="expYear" value={values.expYear || ''} onChange={(name, value) => change(name, value ? Number(value) : 0)} error={errors.expYear} inputMode="numeric" placeholder="AA" maxLength={2} autoComplete="cc-exp-year" required />
              </div>
              <Field label="CVC" name="cvc" value={values.cvc} onChange={(name, value) => change(name, digitsOnly(String(value)).slice(0, 4))} error={errors.cvc} inputMode="numeric" placeholder="123" maxLength={4} autoComplete="cc-csc" required />
            </div>
          </div>
          <div className="dialog__actions">
            <button className="button btn button--quiet" type="button" onClick={onClose}><ArrowLeft size={16} /> Volver</button>
            <button className="button btn btn-primary button--primary" type="submit">Revisar pedido <ArrowRight size={16} /></button>
          </div>
          <p className="secure-note"><LockKeyhole size={13} /> Tus datos de tarjeta se usan solo para este pago y no se guardan.</p>
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
    <div className="summary-backdrop">
      <section className="summary-card" aria-labelledby="summary-title">
        <div className="summary-card__header">
          <div><p className="eyebrow">PASO 3 DE 3</p><h2 id="summary-title">Resumen de compra</h2></div>
          <span className="secure-badge"><ShieldCheck size={15} /> Pago protegido</span>
        </div>
        <div className="summary-product">
          <img src={product.imageUrl} alt="" />
          <div><p className="summary-product__name">{product.name}</p><span>1 unidad</span></div>
          <strong>{formatCop(product.price)}</strong>
        </div>
        <div className="summary-lines">
          <div><span>Producto</span><span>{formatCop(product.price)}</span></div>
          <div><span>Tarifa de servicio</span><span>{formatCop(baseFee)}</span></div>
          <div><span><Truck size={15} /> Envío</span><span>{formatCop(deliveryFee)}</span></div>
        </div>
        <div className="summary-total"><span>Total a pagar</span><strong>{formatCop(product.price + baseFee + deliveryFee)}</strong></div>
        {error && <div className="alert alert-error alert--error" role="alert">{error}</div>}
        <button className="button btn btn-primary button--primary button--full" type="button" onClick={onPay} disabled={busy}>
          {busy ? <><span className="spinner" /> Procesando pago...</> : <>Pagar {formatCop(product.price + baseFee + deliveryFee)} <ArrowRight size={17} /></>}
        </button>
        <p className="secure-note"><LockKeyhole size={13} /> No cierres esta ventana mientras confirmamos tu pago.</p>
        <button className="summary-back" type="button" onClick={onBack} disabled={busy}><ArrowLeft size={15} /> Volver a mis datos</button>
      </section>
    </div>
  )
}

function PaymentResult({ status, reference, onContinue }: { status: string; reference: string; onContinue: () => void }) {
  const isApproved = status === 'APPROVED'
  const isPending = status === 'PENDING' || status === 'UNKNOWN'
  const heading = isApproved ? '¡Tu pedido está en camino!' : isPending ? 'Estamos confirmando tu pago' : 'No pudimos completar el pago'
  const detail = isApproved
    ? 'El pago fue aprobado y estamos preparando tu producto para el envío.'
    : isPending
      ? 'El pago aún aparece pendiente. Puedes consultar el estado más tarde con tu referencia.'
      : 'La transacción no fue aprobada. Puedes volver a la tienda e intentarlo nuevamente.'

  return (
    <main className="result-wrap">
      <div className={isApproved ? 'result-icon result-icon--success' : isPending ? 'result-icon result-icon--pending' : 'result-icon result-icon--failed'}>
        {isApproved ? <PackageCheck size={34} /> : isPending ? <ShieldCheck size={34} /> : <X size={34} />}
      </div>
      <p className="eyebrow">ESTADO DE TU PEDIDO</p>
      <h1>{heading}</h1>
      <p className="result-copy">{detail}</p>
      <div className="reference-card"><span>Número de transacción</span><strong>{reference}</strong><span className="reference-status">{status}</span></div>
      <button className="button btn btn-primary button--primary" type="button" onClick={onContinue}><ShoppingBag size={17} /> Volver a la tienda</button>
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
    return <div className="app-shell"><Header /><Stepper step={step} /><PaymentResult status={transaction.status} reference={transaction.reference || transaction.id} onContinue={returnToCatalog} /><Footer /></div>
  }

  return (
    <div className="app-shell">
      <Header />
      <main>
        <section className="hero">
          <div className="hero__copy">
            <p className="eyebrow">OBJETOS PARA TU DÍA A DÍA</p>
            <h1>Pequeños detalles.<br /><span>Grandes momentos.</span></h1>
            <p className="hero__description">Tecnología seleccionada para acompañarte, en casa y donde estés.</p>
            <a className="hero__link" href="#productos">Descubrir productos <ArrowRight size={16} /></a>
          </div>
          <div className="hero__art" aria-hidden="true">
            <div className="hero__sun" />
            <div className="hero__shape hero__shape--one" />
            <div className="hero__shape hero__shape--two" />
            <div className="hero__label">OBJETOS<br />CON INTENCIÓN</div>
          </div>
        </section>

        <section className="catalog-section" id="productos">
          <div className="section-heading">
            <div><p className="eyebrow">LA COLECCIÓN</p><h2>Encuentra tu próximo favorito</h2></div>
            <span className="collection-count">{products.length.toString().padStart(2, '0')} artículos</span>
          </div>
          {loadingProducts && products.length === 0 ? (
            <div className="loading-state"><span className="spinner spinner--dark" /><span>Cargando productos</span></div>
          ) : error && products.length === 0 ? (
            <div className="empty-state"><p>{error}</p><button className="button button--outline" type="button" onClick={() => void dispatch(loadProducts())}>Intentar de nuevo</button></div>
          ) : products.length === 0 ? (
            <div className="empty-state"><p>Por ahora no hay productos disponibles.</p></div>
          ) : (
            <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onBuy={(id) => { dispatch(selectProduct(id)); dispatch(clearError()) }} />)}</div>
          )}
        </section>

        <section className="promise-strip" aria-label="Beneficios de compra">
          <div><Truck size={19} /><span>Envío con seguimiento</span></div>
          <div><ShieldCheck size={19} /><span>Pago protegido</span></div>
          <div><PackageCheck size={19} /><span>Stock en tiempo real</span></div>
        </section>
      </main>
      <Footer />
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
        <span className="brand__mark">w</span><span>womp<span className="brand__period">.</span></span>
      </button>
      <nav className="header-nav" aria-label="Navegación principal">
        <a href="#productos">Tienda</a><a href="#beneficios">Nuestra promesa</a>
      </nav>
      <span className="header-secure"><LockKeyhole size={14} /> Compra segura</span>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer" id="beneficios">
      <span>Compra tranquila. Recibe en casa.</span>
      <span>© 2026 womp test</span>
    </footer>
  )
}
