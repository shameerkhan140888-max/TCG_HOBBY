'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CheckoutAddress, PublicBasket, PublicBasketInputItem, ShippingMethodCode } from '@tcg-hobby/types';

export const IRON_SPRUE_BASKET_STORAGE_KEY = 'iron-sprue-basket-v1';
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
  return { ok: true, message: 'Added to basket.' };
}

async function resolveLiveBasketLine(item: StoredBasketItem) {
  const response = await fetch('/api/cart/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: toInputItems([item]) }),
  });
  if (!response.ok) return null;
  const payload = await response.json() as PublicBasket;
  return payload.items.find((candidate) => candidate.productId === item.productId) ?? null;
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
  const outOfStock = availabilityLimit(item) <= 0;
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
            setMessage(result.message);
            setMessageOk(result.ok);
          } catch {
            setMessage('Stock could not be confirmed. Please try again.');
            setMessageOk(false);
          } finally {
            setIsAdding(false);
          }
        }}
      >
        {outOfStock ? 'Out of stock' : isAdding ? 'Checking stock...' : 'Add to basket'}
      </button>
      {message ? <p className={`form-status ${messageOk ? 'notice' : 'error'}`}>{message}</p> : null}
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
  const [status, setStatus] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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

  const resolvedByProductId = useMemo(() => {
    return new Map((resolved?.items ?? []).map((item) => [item.productId, item]));
  }, [resolved]);
  const basketLineItems = useMemo(() => {
    return items.map((item) => {
      const live = resolvedByProductId.get(item.productId);
      return {
        ...item,
        quantity: live?.quantity ?? item.quantity,
        unitPriceMinor: live?.unitPriceMinor ?? item.unitPriceMinor,
        imageUrl: live?.imageUrl ?? item.imageUrl ?? null,
        imageAlt: live?.imageAlt ?? item.imageAlt ?? null,
        availableQuantity: live?.availableQuantity ?? item.availableQuantity ?? null,
        inStock: live?.inStock ?? availabilityLimit(item) >= item.quantity,
      };
    });
  }, [items, resolvedByProductId]);
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

  if (!mounted) {
    return (
      <div className="empty-state basket-loading" aria-live="polite">
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
          <div>
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
                const quantity = Math.min(Math.max(Number(event.target.value) || 1, 1), Math.max(limit, 1));
                const next = items.map((candidate) => candidate.productId === item.productId ? { ...candidate, quantity } : candidate);
                setItems(next);
                writeBasket(next);
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
            <div className="basket-payment-strip" aria-label="Supported payment method">
              <span>Supported payment</span>
              <strong>Card payments</strong>
            </div>
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
                  <a href={`/products/${product.productSlug}`}>
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt ?? product.productName} /> : <span className="basket-image-fallback">Iron Sprue</span>}
                  </a>
                  <div>
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

  return (
    <div className="basket-layout">
      {basketLines}

      <form
        className="checkout-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsCheckingOut(true);
          setStatus('Starting secure checkout...');
          try {
            const response = await fetch('/api/checkout/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                guestItems: toInputItems(items),
                shippingAddress: address,
                shippingMethodCode,
              }),
            });
            const payload = await response.json();
            if (!response.ok || !payload.checkoutUrl) throw new Error(payload.message ?? payload.error ?? 'Checkout could not be started.');
            window.location.href = payload.checkoutUrl;
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Checkout could not be started.');
            setIsCheckingOut(false);
          }
        }}
      >
        <h2>Delivery and payment</h2>
        {hasUnavailableItems ? (
          <p className="form-status">One or more basket items are no longer available. Return to basket and remove them before checkout.</p>
        ) : null}
        <div className="checkout-grid">
          <label>Full name<input required value={address.fullName} onChange={(event) => setAddress({ ...address, fullName: event.target.value })} /></label>
          <label>Email<input required type="email" value={address.email} onChange={(event) => setAddress({ ...address, email: event.target.value })} /></label>
          <label>Address line 1<input required value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} /></label>
          <label>Address line 2<input value={address.line2 ?? ''} onChange={(event) => setAddress({ ...address, line2: event.target.value || null })} /></label>
          <label>City<input required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} /></label>
          <label>Postcode<input required value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} /></label>
          <label>Country<input required value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value.toUpperCase() })} /></label>
          <label>Delivery
            <select value={shippingMethodCode} onChange={(event) => setShippingMethodCode(event.target.value as ShippingMethodCode)}>
              <option value="UK_STANDARD">Standard delivery</option>
              <option value="UK_EXPRESS">Express delivery</option>
            </select>
          </label>
        </div>
        <div className="checkout-totals">
          <span>Subtotal</span><strong>{formatPrice(subtotalMinor)}</strong>
          <span>Delivery</span><strong>{formatPrice(deliveryMinor)}</strong>
          <span>Total</span><strong>{formatPrice(subtotalMinor + deliveryMinor)}</strong>
        </div>
        <button type="submit" disabled={isCheckingOut || hasUnavailableItems}>{isCheckingOut ? 'Starting checkout...' : 'Pay securely with Stripe'}</button>
        {status ? <p className="form-status">{status}</p> : null}
      </form>
    </div>
  );
}
