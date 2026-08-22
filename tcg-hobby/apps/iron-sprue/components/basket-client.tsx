'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CheckoutAddress, PublicBasket, PublicBasketInputItem, ShippingMethodCode } from '@tcg-hobby/types';
import { trackIronSprueEcommerceEvent } from '../lib/analytics';
import { PaymentMethodStrip } from './payment-method-strip';

export const IRON_SPRUE_BASKET_STORAGE_KEY = 'iron-sprue-basket-v1';
export const IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY = 'iron-sprue-pending-payment-basket-v1';
export const IRON_SPRUE_LEGACY_BASKET_STORAGE_KEYS = [
  'iron-sprue-basket',
  'iron-sprue-cart',
  'iron-sprue-cart-v1',
  'iron-sprue-basket-items',
] as const;

const ALL_BASKET_STORAGE_KEYS = [IRON_SPRUE_BASKET_STORAGE_KEY, ...IRON_SPRUE_LEGACY_BASKET_STORAGE_KEYS] as const;

export type StoredBasketItem = {
  productId: string;
  productName: string;
  productSlug: string;
  unitPriceMinor: number;
  quantity: number;
  availableQuantity?: number | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type BasketUpsellProduct = Omit<StoredBasketItem, 'quantity'>;

type CheckoutPaymentIntent = {
  orderNumber: string;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  totalMinor: number;
  currency: string;
};

type CheckoutStep = 'details' | 'review' | 'payment';

type StripePaymentElement = {
  mount(selector: string): void;
  unmount(): void;
  on?(event: 'ready' | 'loaderror', handler: (event?: { error?: { message?: string } }) => void): void;
};

type StripeElements = {
  create(type: 'payment'): StripePaymentElement;
};

type StripeInstance = {
  elements(options: { clientSecret: string; appearance?: Record<string, unknown> }): StripeElements;
  confirmPayment(options: {
    elements: StripeElements;
    confirmParams: { return_url: string };
  }): Promise<{ error?: { message?: string } }>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance | null;
  }
}

let stripeScriptPromise: Promise<void> | null = null;

function loadStripeScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Payment form is not available yet.'));
  if (window.Stripe) return Promise.resolve();
  stripeScriptPromise = stripeScriptPromise ?? new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-iron-sprue-stripe-js="true"]');
    if (existing) {
      if (window.Stripe) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Secure payment form could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.dataset.ironSprueStripeJs = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Secure payment form could not be loaded.'));
    document.head.appendChild(script);
  });
  return stripeScriptPromise;
}

function focusCheckoutField(fieldId: string) {
  const field = document.getElementById(fieldId);
  field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (field instanceof HTMLElement) field.focus();
}

function readBasket(): StoredBasketItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(IRON_SPRUE_BASKET_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item?.productId && Number.isInteger(item.quantity)) : [];
  } catch {
    return [];
  }
}

export function readIronSprueBasketCount() {
  return readBasket().reduce((total, item) => total + item.quantity, 0);
}

function writeBasket(items: StoredBasketItem[]) {
  window.localStorage.setItem(IRON_SPRUE_BASKET_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('iron-sprue-basket-updated'));
}

function writePendingPaymentBasket(items: StoredBasketItem[]) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY, JSON.stringify(items));
}

export function holdIronSprueBasketForPendingPayment() {
  const items = readBasket();
  if (!items.length) return items;
  writePendingPaymentBasket(items);
  window.localStorage.setItem(IRON_SPRUE_BASKET_STORAGE_KEY, '[]');
  window.dispatchEvent(new CustomEvent('iron-sprue-basket-updated'));
  return items;
}

export function restoreIronSprueBasketAfterFailedPayment() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY) ?? '[]');
    const items = Array.isArray(parsed) ? parsed.filter((item) => item?.productId && Number.isInteger(item.quantity)) : [];
    if (items.length) writeBasket(items);
    return items;
  } catch {
    return [];
  } finally {
    window.sessionStorage.removeItem(IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY);
  }
}

export function updateIronSprueBasketItemQuantity(item: Pick<StoredBasketItem, 'productId' | 'availableQuantity'>, requestedQuantity: number) {
  const items = readBasket();
  const limit = availabilityLimit(item);
  const nextQuantity = Math.min(Math.max(Number(requestedQuantity) || 1, 1), Math.max(limit, 1), 99);
  const next = items.map((candidate) => (
    candidate.productId === item.productId ? { ...candidate, quantity: nextQuantity } : candidate
  ));
  writeBasket(next);
  return {
    items: next,
    quantity: nextQuantity,
    capped: nextQuantity !== requestedQuantity,
    limit,
  };
}

export function clearIronSprueBasket() {
  if (typeof window === 'undefined') return;
  for (const key of ALL_BASKET_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
  window.localStorage.setItem(IRON_SPRUE_BASKET_STORAGE_KEY, '[]');
  window.dispatchEvent(new CustomEvent('iron-sprue-basket-updated'));
}

export async function clearIronSprueBasketAfterPaidCheckout() {
  clearIronSprueBasket();
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(IRON_SPRUE_PENDING_PAYMENT_BASKET_STORAGE_KEY);
  try {
    await fetch('/api/cart', { method: 'DELETE', cache: 'no-store' });
  } catch {
    // Local basket clearing is authoritative for guest checkout; authenticated cart clearing retries on the next success refresh.
  } finally {
    clearIronSprueBasket();
  }
}

function availabilityLimit(item: Pick<StoredBasketItem, 'availableQuantity'>) {
  return typeof item.availableQuantity === 'number' ? Math.max(0, item.availableQuantity) : 99;
}

export function addIronSprueBasketItem(item: StoredBasketItem) {
  const limit = availabilityLimit(item);
  if (limit <= 0) {
    return { ok: false, message: 'This item is out of stock.' };
  }
  const items = readBasket();
  const existing = items.find((candidate) => candidate.productId === item.productId);
  const requestedQuantity = Math.min(Math.max(item.quantity, 1), 99);
  const requestedTotal = (existing?.quantity ?? 0) + requestedQuantity;
  const nextQuantity = Math.min(requestedTotal, limit, 99);
  if (existing) {
    existing.quantity = nextQuantity;
    existing.availableQuantity = item.availableQuantity ?? existing.availableQuantity ?? null;
  } else {
    items.push({ ...item, quantity: Math.min(requestedQuantity, limit, 99) });
  }
  writeBasket(items);
  if (requestedTotal > limit) {
    return { ok: true, message: `Only ${limit} available. Basket quantity has been capped.` };
  }
  return { ok: true, message: 'Added to basket' };
}

async function resolveLiveBasketLine(item: StoredBasketItem) {
  const response = await fetch('/api/cart/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: toInputItems([item]) }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as PublicBasket;
  return findResolvedBasketItem(payload.items, item) ?? null;
}

function findResolvedBasketItem(items: PublicBasket['items'], item: Pick<StoredBasketItem, 'productId' | 'productSlug'>) {
  return items.find((candidate) => (
    candidate.productId === item.productId
    || candidate.productSlug === item.productSlug
  ));
}

export async function addIronSprueBasketItemWithLiveStock(item: StoredBasketItem) {
  if (typeof window === 'undefined') return { ok: false, message: 'Basket is not available yet.' };
  const existing = readBasket().find((candidate) => candidate.productId === item.productId);
  const requestedQuantity = Math.min(Math.max(item.quantity, 1), 99);
  const liveLine = await resolveLiveBasketLine({
    ...item,
    quantity: (existing?.quantity ?? 0) + requestedQuantity,
  });
  if (!liveLine) return { ok: false, message: 'Stock could not be confirmed. Please try again.' };
  const liveLimit = availabilityLimit(liveLine);
  if (liveLimit <= 0) {
    return { ok: false, message: 'This item is out of stock.' };
  }
  return addIronSprueBasketItem({
    ...item,
    productName: liveLine.productName ?? item.productName,
    productSlug: liveLine.productSlug ?? item.productSlug,
    unitPriceMinor: liveLine.unitPriceMinor ?? item.unitPriceMinor,
    availableQuantity: liveLimit,
    imageUrl: liveLine.imageUrl ?? item.imageUrl ?? null,
    imageAlt: liveLine.imageAlt ?? item.imageAlt ?? item.productName,
    quantity: requestedQuantity,
  });
}

export function AddToBasketButton({ item, quantityInputId }: { item: Omit<StoredBasketItem, 'quantity'>; quantityInputId?: string }) {
  const [message, setMessage] = useState('');
  const [messageOk, setMessageOk] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outOfStock = availabilityLimit(item) <= 0;

  useEffect(() => () => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
  }, []);

  function showTemporaryMessage(nextMessage: string, ok: boolean) {
    setMessage(nextMessage);
    setMessageOk(ok);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(''), 3200);
  }

  return (
    <div className="basket-action-stack">
      <button
        type="button"
        disabled={outOfStock || isAdding}
        onClick={async () => {
          const input = quantityInputId ? document.getElementById(quantityInputId) as HTMLInputElement | null : null;
          const quantity = Math.max(Number(input?.value) || 1, 1);
          setIsAdding(true);
          try {
            const result = await addIronSprueBasketItemWithLiveStock({ ...item, quantity });
            showTemporaryMessage(result.message, result.ok);
            if (result.ok) {
              trackIronSprueEcommerceEvent('add_to_cart', {
                currency: 'GBP',
                value: (item.unitPriceMinor * quantity) / 100,
                items: [{ item_id: item.productId, item_name: item.productName, quantity, price: item.unitPriceMinor / 100 }],
              });
            }
          } catch {
            showTemporaryMessage('Stock could not be confirmed. Please try again.', false);
          } finally {
            setIsAdding(false);
          }
        }}
      >
        {outOfStock ? 'Out of stock' : isAdding ? 'Checking stock...' : 'Add to basket'}
      </button>
      {message ? (
        <div className={`add-to-basket-feedback ${messageOk ? 'notice' : 'error'}`} role="status">
          <span>{messageOk && message === 'Added to basket' ? '✓ Added to basket' : message}</span>
        </div>
      ) : null}
    </div>
  );
}

function formatPrice(minor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

function toInputItems(items: StoredBasketItem[]): PublicBasketInputItem[] {
  return items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
}

function basketLineWarning(item: StoredBasketItem & { inStock?: boolean }) {
  const limit = availabilityLimit(item);
  if (limit <= 0 || item.inStock === false) return 'This item is no longer available.';
  if (item.quantity > limit) return `Only ${limit} available. Reduce the quantity or remove this item before checkout.`;
  return '';
}

function StripePaymentElementForm({
  paymentIntent,
  onUnavailable,
}: {
  paymentIntent: CheckoutPaymentIntent;
  onUnavailable: (message?: string) => void;
}) {
  const [stripe, setStripe] = useState<StripeInstance | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const mountId = `iron-sprue-payment-element-${paymentIntent.paymentIntentId}`;

  useEffect(() => {
    let cancelled = false;
    let mountedElement: StripePaymentElement | null = null;
    let readyTimeout: ReturnType<typeof setTimeout> | null = null;
    let reportedUnavailable = false;
    const reportUnavailable = (message?: string) => {
      if (cancelled || reportedUnavailable) return;
      reportedUnavailable = true;
      const nextMessage = message || 'Secure payment form could not be loaded. Please try again.';
      setPaymentStatus(nextMessage);
      onUnavailable(nextMessage);
    };
    setPaymentStatus('Loading secure payment form...');
    setStripe(null);
    setElements(null);

    void loadStripeScript()
      .then(() => {
        if (cancelled) return;
        const stripeInstance = window.Stripe?.(paymentIntent.publishableKey) ?? null;
        if (!stripeInstance) throw new Error('Secure payment form could not be initialised.');
        const nextElements = stripeInstance.elements({
          clientSecret: paymentIntent.clientSecret,
          appearance: {
            theme: 'night',
            variables: {
              colorPrimary: '#c7923d',
              colorBackground: '#111311',
              colorText: '#f8f3e7',
              colorDanger: '#cf3f32',
              borderRadius: '6px',
              fontFamily: 'Arial, sans-serif',
            },
          },
        });
        mountedElement = nextElements.create('payment');
        mountedElement.on?.('ready', () => {
          if (cancelled || reportedUnavailable) return;
          if (readyTimeout) clearTimeout(readyTimeout);
          setStripe(stripeInstance);
          setElements(nextElements);
          setPaymentStatus('');
        });
        mountedElement.on?.('loaderror', (event) => {
          if (readyTimeout) clearTimeout(readyTimeout);
          reportUnavailable(event?.error?.message || 'Secure payment form could not be loaded. Please try again.');
        });
        mountedElement.mount(`#${mountId}`);
        readyTimeout = setTimeout(() => {
          reportUnavailable('Secure payment form could not be loaded. Please try again.');
        }, 12000);
      })
      .catch((error) => {
        reportUnavailable(error instanceof Error ? error.message : 'Secure payment form could not be loaded. Please try again.');
      });

    return () => {
      cancelled = true;
      if (readyTimeout) clearTimeout(readyTimeout);
      mountedElement?.unmount();
    };
  }, [mountId, onUnavailable, paymentIntent.clientSecret, paymentIntent.publishableKey]);

  return (
    <section className="payment-element-shell" aria-label="Secure payment">
      <div className="payment-element-head">
        <p className="eyebrow">Secure payment</p>
        <h3>Pay by card</h3>
        <p>Card details are handled securely by the payment provider. Iron Sprue does not store card numbers.</p>
      </div>
      <div id={mountId} className="payment-element-mount" />
      <button
        type="button"
        disabled={!stripe || !elements || isSubmittingPayment}
        onClick={async () => {
          if (!stripe || !elements) return;
          setIsSubmittingPayment(true);
          setPaymentStatus('Confirming payment...');
          holdIronSprueBasketForPendingPayment();
          const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/success?payment_intent=${encodeURIComponent(paymentIntent.paymentIntentId)}`,
            },
          });
          if (result.error) {
            restoreIronSprueBasketAfterFailedPayment();
            setPaymentStatus(result.error.message ?? 'Payment could not be completed. Please check your details and try again.');
            setIsSubmittingPayment(false);
          }
        }}
      >
        {isSubmittingPayment ? 'Processing payment...' : `Pay ${formatPrice(paymentIntent.totalMinor)}`}
      </button>
      {paymentStatus ? <p className={`form-status${paymentStatus.includes('could not') ? ' error' : ''}`}>{paymentStatus}</p> : null}
    </section>
  );
}

const defaultAddress: CheckoutAddress = {
  fullName: '',
  email: '',
  line1: '',
  line2: null,
  city: '',
  region: null,
  postalCode: '',
  country: 'GB',
};

export function BasketClient({ mode = 'basket', upsellProducts = [] }: { mode?: 'basket' | 'checkout'; upsellProducts?: BasketUpsellProduct[] }) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<StoredBasketItem[]>([]);
  const [resolved, setResolved] = useState<PublicBasket | null>(null);
  const [address, setAddress] = useState<CheckoutAddress>(defaultAddress);
  const [shippingMethodCode, setShippingMethodCode] = useState<ShippingMethodCode>('UK_STANDARD');
  const [discountCode, setDiscountCode] = useState('');
  const [status, setStatus] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutPaymentIntent, setCheckoutPaymentIntent] = useState<CheckoutPaymentIntent | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('details');

  useEffect(() => {
    const refresh = () => setItems(readBasket());
    setMounted(true);
    refresh();
    window.addEventListener('iron-sprue-basket-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('iron-sprue-basket-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!mounted || !items.length) {
        setResolved(null);
        return;
      }
      const response = await fetch('/api/cart/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: toInputItems(items) }),
      });
      if (!cancelled && response.ok) setResolved(await response.json());
    }
    resolve().catch(() => setResolved(null));
    return () => {
      cancelled = true;
    };
  }, [items, mounted]);

  useEffect(() => {
    if (mode !== 'checkout' || typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [checkoutStep, mode]);

  const resolvedByIdentity = useMemo(() => {
    const entries: Array<[string, PublicBasket['items'][number]]> = [];
    for (const item of resolved?.items ?? []) {
      entries.push([item.productId, item], [item.productSlug, item]);
    }
    return new Map(entries);
  }, [resolved]);
  const basketLineItems = useMemo(() => {
    return items.map((item) => {
      const live = resolvedByIdentity.get(item.productId) ?? resolvedByIdentity.get(item.productSlug);
      const availableQuantity = live?.availableQuantity ?? item.availableQuantity ?? null;
      const quantity = typeof availableQuantity === 'number' && availableQuantity > 0
        ? Math.min(item.quantity, availableQuantity)
        : item.quantity;
      return {
        ...item,
        quantity,
        unitPriceMinor: live?.unitPriceMinor ?? item.unitPriceMinor,
        imageUrl: live?.imageUrl ?? item.imageUrl ?? null,
        imageAlt: live?.imageAlt ?? item.imageAlt ?? null,
        availableQuantity,
        inStock: live?.inStock ?? availabilityLimit({ ...item, availableQuantity }) >= quantity,
      };
    });
  }, [items, resolvedByIdentity]);
  const basketProductIds = useMemo(() => new Set(basketLineItems.map((item) => item.productId)), [basketLineItems]);
  const visibleUpsells = useMemo(() => {
    return upsellProducts
      .filter((product) => !basketProductIds.has(product.productId))
      .filter((product) => availabilityLimit(product) > 0)
      .slice(0, 4);
  }, [basketProductIds, upsellProducts]);
  const subtotalMinor = resolved?.subtotalMinor ?? basketLineItems.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
  const hasUnavailableItems = basketLineItems.some((item) => Boolean(basketLineWarning(item)));
  const deliveryMinor = useMemo(() => {
    if (shippingMethodCode === 'UK_STANDARD' && subtotalMinor >= 5000) return 0;
    if (shippingMethodCode === 'UK_EXPRESS' && subtotalMinor >= 5000) return 299;
    return shippingMethodCode === 'UK_EXPRESS' ? 499 : 299;
  }, [shippingMethodCode, subtotalMinor]);
  const totalMinor = checkoutPaymentIntent?.totalMinor ?? subtotalMinor + deliveryMinor;
  const vatIncludedEstimateMinor = Math.round(totalMinor / 6);
  const requiredDetailsComplete = Boolean(
    address.fullName.trim()
    && address.email.trim()
    && address.line1.trim()
    && address.city.trim()
    && address.postalCode.trim()
    && address.country.trim(),
  );

  useEffect(() => {
    setCheckoutPaymentIntent(null);
    if (mode === 'checkout') {
      setCheckoutStep((current) => (current === 'payment' ? 'review' : current));
    }
  }, [address, discountCode, items, mode, shippingMethodCode]);

  useEffect(() => {
    let changed = false;
    const nextItems = items.map((item) => {
      const line = basketLineItems.find((candidate) => (
        candidate.productId === item.productId || candidate.productSlug === item.productSlug
      ));
      if (!line || line.quantity === item.quantity) return item;
      changed = true;
      return {
        ...item,
        quantity: line.quantity,
        availableQuantity: line.availableQuantity,
        unitPriceMinor: line.unitPriceMinor,
        imageUrl: line.imageUrl,
        imageAlt: line.imageAlt,
      };
    });
    if (!changed) return;
    setItems(nextItems);
    writeBasket(nextItems);
    setCheckoutPaymentIntent(null);
    setStatus('Basket quantity updated to match current stock.');
  }, [basketLineItems, items]);

  useEffect(() => {
    if (hasUnavailableItems) {
      setCheckoutPaymentIntent(null);
      setStatus('');
      if (mode === 'checkout' && checkoutStep === 'payment') setCheckoutStep('review');
    }
  }, [checkoutStep, hasUnavailableItems, mode]);

  async function prepareSecurePayment() {
    setIsCheckingOut(true);
    setStatus('Preparing secure payment...');
    try {
      const response = await fetch('/api/checkout/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestItems: toInputItems(items),
          shippingAddress: address,
          shippingMethodCode,
          discountCode: discountCode.trim() || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.clientSecret || !payload.publishableKey || !payload.paymentIntentId) {
        throw new Error(payload.message ?? payload.error ?? 'Checkout could not be started.');
      }
      setCheckoutPaymentIntent(payload as CheckoutPaymentIntent);
      setCheckoutStep('payment');
      setStatus('');
      trackIronSprueEcommerceEvent('begin_checkout', {
        currency: 'GBP',
        value: (payload.totalMinor ?? subtotalMinor + deliveryMinor) / 100,
        coupon: discountCode.trim() || undefined,
        items: basketLineItems.map((item) => ({
          item_id: item.productId,
          item_name: item.productName,
          quantity: item.quantity,
          price: item.unitPriceMinor / 100,
        })),
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Checkout could not be started.');
    } finally {
      setIsCheckingOut(false);
    }
  }

  const handlePaymentElementUnavailable = useCallback(async (message?: string) => {
    const intent = checkoutPaymentIntent;
    if (!intent) return;
    try {
      await fetch('/api/checkout/payment-intent/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: intent.paymentIntentId }),
      });
    } finally {
      setCheckoutPaymentIntent(null);
      setCheckoutStep('review');
      setStatus(message || 'Secure payment form could not be loaded. Please try again.');
      setItems((current) => [...current]);
    }
  }, [checkoutPaymentIntent]);

  if (!mounted) {
    return (
      <div className="checkout-panel basket-loading" aria-live="polite">
        <h2>Loading your basket.</h2>
        <p>Checking the items saved on this device.</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="empty-state">
        <h2>Your basket is empty.</h2>
        <p>Start with model kits, puzzle builds or workshop essentials.</p>
        <a className="button" href="/shop">Continue shopping</a>
      </div>
    );
  }

  const basketLines = (
    <section className="basket-lines">
      {basketLineItems.map((item) => {
        const warning = basketLineWarning(item);
        const limit = availabilityLimit(item);
        return (
        <article className={`basket-line${warning ? ' unavailable' : ''}`} key={item.productId}>
          {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt ?? item.productName} width="120" height="120" /> : <span className="basket-image-fallback">Iron Sprue</span>}
          <div className="basket-line-details">
            <p className="eyebrow">Basket item</p>
            <a href={`/products/${item.productSlug}`}>{item.productName}</a>
            <p>{formatPrice(item.unitPriceMinor)} inc VAT</p>
            {warning ? <p className="basket-line-warning">{warning}</p> : null}
          </div>
          <label>
            Qty
            <input
              type="number"
              min="1"
              max={Math.max(limit, 1)}
              value={item.quantity}
              disabled={limit <= 0}
              onChange={(event) => {
                const result = updateIronSprueBasketItemQuantity(item, Number(event.target.value) || 1);
                setItems(result.items);
              }}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              const next = items.filter((candidate) => candidate.productId !== item.productId);
              setItems(next);
              writeBasket(next);
            }}
          >
            Remove
          </button>
        </article>
        );
      })}
    </section>
  );

  if (mode === 'basket') {
    return (
      <div className="basket-page-stack">
        <div className="basket-layout">
          {basketLines}
          <aside className="checkout-panel basket-review-panel">
            <p className="eyebrow">Order summary</p>
            <h2>Review your order</h2>
            <p className="basket-summary-copy">Review your order before proceeding to secure checkout.</p>
            <div className="basket-summary-items" aria-label="Basket items summary">
              {basketLineItems.map((item) => (
                <div key={item.productId}>
                  <span>{item.productName} x {item.quantity}</span>
                  <strong>{formatPrice(item.unitPriceMinor * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <span>Subtotal</span><strong>{formatPrice(subtotalMinor)}</strong>
              <span>Estimated delivery</span><strong>{formatPrice(deliveryMinor)}</strong>
              <span>Estimated total</span><strong>{formatPrice(subtotalMinor + deliveryMinor)}</strong>
            </div>
            {hasUnavailableItems ? (
              <p className="form-status error">One or more basket items are no longer available. Remove them before checkout.</p>
            ) : null}
            {hasUnavailableItems ? (
              <button type="button" className="button" disabled>Proceed to checkout</button>
            ) : (
              <a className="button" href="/checkout">Proceed to checkout</a>
            )}
            <PaymentMethodStrip compact />
            <a className="text-link" href="/shop">Continue shopping</a>
          </aside>
        </div>
        {visibleUpsells.length ? (
          <section className="basket-upsell-section">
            <div>
              <p className="eyebrow">Complete your build</p>
              <h2>Useful additions for the bench</h2>
            </div>
            <div className="basket-upsell-grid">
              {visibleUpsells.map((product) => (
                <article className="basket-upsell-card" key={product.productId}>
                  <a className="basket-upsell-image" href={`/products/${product.productSlug}`}>
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt ?? product.productName} /> : <span className="basket-image-fallback">Iron Sprue</span>}
                  </a>
                  <div className="basket-upsell-info">
                    <p className="eyebrow">Add-on</p>
                    <a href={`/products/${product.productSlug}`}>{product.productName}</a>
                    <p>{formatPrice(product.unitPriceMinor)} inc VAT</p>
                    <AddToBasketButton item={product} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (checkoutStep === 'review') {
    return (
      <div className="checkout-page-stack">
        <section className="checkout-panel checkout-review-page" aria-label="Order review">
          <p className="eyebrow">Order review</p>
          <h2>Check everything before secure payment.</h2>
          <div className="checkout-review-lines receipt-lines">
            {basketLineItems.map((item) => (
              <article className="checkout-review-line" key={item.productId}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt ?? item.productName} width="64" height="64" /> : <span className="basket-image-fallback">Iron Sprue</span>}
                <div>
                  <strong>{item.productName}</strong>
                  <span>{formatPrice(item.unitPriceMinor)} each</span>
                  <div className="review-quantity-control" aria-label={`Quantity for ${item.productName}`}>
                    <button
                      type="button"
                      className="quantity-stepper"
                      disabled={item.quantity <= 1}
                      onClick={() => {
                        const result = updateIronSprueBasketItemQuantity(item, item.quantity - 1);
                        setItems(result.items);
                        setStatus('');
                      }}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      className="quantity-stepper"
                      disabled={availabilityLimit(item) <= item.quantity}
                      onClick={() => {
                        const result = updateIronSprueBasketItemQuantity(item, item.quantity + 1);
                        setItems(result.items);
                        setStatus(result.capped ? `Only ${result.limit} available for ${item.productName}.` : '');
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <strong>{formatPrice(item.unitPriceMinor * item.quantity)}</strong>
              </article>
            ))}
          </div>
          <div className="checkout-review-grid">
            <section>
              <div className="checkout-review-title">
                <span>Delivery address</span>
                <button type="button" className="text-button" onClick={() => setCheckoutStep('details')}>Edit address</button>
              </div>
              <p>
                {address.fullName}<br />
                {address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />
                {address.city}<br />
                {address.postalCode}<br />
                {address.country}
              </p>
            </section>
            <section>
              <div className="checkout-review-title">
                <span>Contact and delivery</span>
                <button type="button" className="text-button" onClick={() => setCheckoutStep('details')}>Edit contact</button>
              </div>
              <p>{address.email}</p>
              <p>{shippingMethodCode === 'UK_EXPRESS' ? 'Express delivery' : 'Standard delivery'} - {formatPrice(deliveryMinor)}</p>
            </section>
          </div>
          <div className="checkout-totals receipt-totals">
            <span>Subtotal</span><strong>{formatPrice(subtotalMinor)}</strong>
            <span>Delivery</span><strong>{formatPrice(deliveryMinor)}</strong>
            <span>VAT included estimate</span><strong>{formatPrice(vatIncludedEstimateMinor)}</strong>
            <span>Total</span><strong>{formatPrice(totalMinor)}</strong>
          </div>
          <PaymentMethodStrip compact />
          {status ? <p className="form-status error">{status}</p> : null}
          <div className="checkout-step-actions">
            <button type="button" disabled={isCheckingOut || hasUnavailableItems} onClick={prepareSecurePayment}>
              {isCheckingOut ? 'Preparing payment...' : 'Continue to secure payment'}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (checkoutStep === 'payment' && checkoutPaymentIntent && !hasUnavailableItems) {
    return (
      <div className="checkout-page-stack">
        <section className="checkout-panel checkout-payment-page" aria-label="Secure payment">
          <p className="eyebrow">Secure payment</p>
          <h2>Complete payment.</h2>
          <div className="checkout-totals receipt-totals">
            <span>Total to pay</span><strong>{formatPrice(checkoutPaymentIntent.totalMinor)}</strong>
          </div>
          <div className="checkout-reassurance checkout-reassurance-icons">
            <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4h8a4 4 0 0 1 0 8h-4v2h5v2h-5v4H9v-4H6v-2h3v-2H6v-2h3V6H6V4zm4 2v4h4a2 2 0 0 0 0-4z" /></svg></span><span><strong>Secure payment</strong> Card details are handled by the embedded payment provider form. Digital wallets may appear where supported by your device and browser.</span></p>
            <p><strong>Order reference</strong> {checkoutPaymentIntent.orderNumber}</p>
          </div>
          <PaymentMethodStrip compact />
          <StripePaymentElementForm paymentIntent={checkoutPaymentIntent} onUnavailable={handlePaymentElementUnavailable} />
          <button type="button" className="button secondary" onClick={() => setCheckoutStep('review')}>Back to order review</button>
        </section>
      </div>
    );
  }

  return (
    <div className="basket-layout checkout-details-layout">
      {basketLines}

      <form
        className="checkout-panel"
        onSubmit={(event) => {
          event.preventDefault();
          setStatus('');
          if (hasUnavailableItems) {
            setStatus('One or more basket items are no longer available. Return to basket and remove them before checkout.');
            return;
          }
          if (!requiredDetailsComplete) {
            setStatus('Complete the required delivery and contact details before reviewing your order.');
            return;
          }
          setCheckoutStep('review');
        }}
      >
        <p className="eyebrow">Delivery details</p>
        <h2>Where should we send it?</h2>
        {hasUnavailableItems ? (
          <p className="form-status error">One or more basket items are no longer available. Return to basket and remove them before checkout.</p>
        ) : null}
        <fieldset className="checkout-fieldset">
          <legend>Contact and delivery</legend>
          <div className="checkout-grid">
            <label htmlFor="checkout-full-name">Full name<input id="checkout-full-name" required value={address.fullName} onChange={(event) => setAddress({ ...address, fullName: event.target.value })} /></label>
            <label htmlFor="checkout-email">Email<input id="checkout-email" required type="email" value={address.email} onChange={(event) => setAddress({ ...address, email: event.target.value })} /></label>
            <label htmlFor="checkout-line-1">Address line 1<input id="checkout-line-1" required value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} /></label>
            <label htmlFor="checkout-line-2">Address line 2<input id="checkout-line-2" value={address.line2 ?? ''} onChange={(event) => setAddress({ ...address, line2: event.target.value || null })} /></label>
            <label htmlFor="checkout-city">City<input id="checkout-city" required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label>
            <label htmlFor="checkout-postcode">Postcode<input id="checkout-postcode" required value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} /></label>
            <label htmlFor="checkout-country">Country<input id="checkout-country" required value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value.toUpperCase() })} /></label>
            <label>Delivery
              <select value={shippingMethodCode} onChange={(event) => setShippingMethodCode(event.target.value as ShippingMethodCode)}>
                <option value="UK_STANDARD">Standard delivery</option>
                <option value="UK_EXPRESS">Express delivery</option>
              </select>
            </label>
            <label>Discount code<input value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} /></label>
          </div>
        </fieldset>
        <div className="checkout-reassurance checkout-reassurance-icons">
          <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg></span><span><strong>Delivery</strong> UK delivery options and costs are confirmed before payment. Free UK delivery applies on eligible orders over £75.</span></p>
          <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8l8-4 8 4-8 4zM4 8v8l8 4V12zM20 8v8l-8 4V12z" /></svg></span><span><strong>Returns</strong> Unused items can be returned in line with the published returns policy.</span></p>
          <p><span className="reassurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4h12v16H6zM9 8h4a3 3 0 0 1 0 6h-2v3H9zm2 2v2h2a1 1 0 0 0 0-2z" /></svg></span><span><strong>Payments</strong> Secure card payments are handled by the embedded payment form. Digital wallets may appear where supported.</span></p>
        </div>
        <div className="checkout-totals">
          <span>Subtotal</span><strong>{formatPrice(subtotalMinor)}</strong>
          <span>Delivery</span><strong>{formatPrice(deliveryMinor)}</strong>
          <span>VAT included estimate</span><strong>{formatPrice(vatIncludedEstimateMinor)}</strong>
          <span>Total</span><strong>{formatPrice(totalMinor)}</strong>
        </div>
        <button type="submit" disabled={hasUnavailableItems}>Continue to review order</button>
        {status ? <p className="form-status error">{status}</p> : null}
      </form>
    </div>
  );
}
