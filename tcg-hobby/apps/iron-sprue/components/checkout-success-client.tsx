'use client';

import { useEffect, useState } from 'react';
import type { PublicOrderDetail } from '@tcg-hobby/types';
import { clearIronSprueBasketAfterPaidCheckout } from './basket-client';

function formatPrice(minor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

export function CheckoutSuccessClient({
  initialOrder,
  sessionId,
}: {
  initialOrder: PublicOrderDetail | null;
  sessionId: string;
}) {
  const [order, setOrder] = useState<PublicOrderDetail | null>(initialOrder);
  const [hasClearedBasket, setHasClearedBasket] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function refreshOrder() {
      try {
        const response = await fetch(`/api/checkout/status/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
        if (response.ok) {
          const nextOrder = await response.json() as PublicOrderDetail;
          if (!cancelled) setOrder(nextOrder);
          if (nextOrder.paymentStatus === 'SUCCEEDED') return;
        }
      } catch {
        // Keep the success page readable while the webhook/API catches up.
      }

      if (!cancelled) timeout = setTimeout(refreshOrder, 2500);
    }

    if (order?.paymentStatus !== 'SUCCEEDED') timeout = setTimeout(refreshOrder, 1500);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [order?.paymentStatus, sessionId]);

  useEffect(() => {
    if (order?.paymentStatus === 'SUCCEEDED' && !hasClearedBasket) {
      void clearIronSprueBasketAfterPaidCheckout();
      setHasClearedBasket(true);
    }
  }, [hasClearedBasket, order?.paymentStatus]);

  return (
    <section className="section-block checkout-result-page">
      <p className="eyebrow">Iron Sprue checkout</p>
      <h1>{order?.paymentStatus === 'SUCCEEDED' ? 'Order confirmed.' : 'Confirming your order.'}</h1>
      {order ? (
        <div className="checkout-result-card">
          <p className="lead">Order {order.orderNumber}</p>
          <dl className="spec-grid">
            <div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div>
            <div><dt>Fulfilment</dt><dd>{order.fulfilmentStatus}</dd></div>
            <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotalMinor)}</dd></div>
            <div><dt>Shipping</dt><dd>{formatPrice(order.shippingMinor)}</dd></div>
            <div><dt>VAT estimate</dt><dd>{formatPrice(order.taxMinor)}</dd></div>
            <div><dt>Total</dt><dd>{formatPrice(order.totalMinor)}</dd></div>
            <div><dt>Delivery</dt><dd>{order.shippingMethodName}</dd></div>
          </dl>
          {order.shippingFullName ? (
            <>
              <h2>Delivery address</h2>
              <address className="order-address">
                <strong>{order.shippingFullName}</strong>
                <span>{order.shippingLine1}</span>
                {order.shippingLine2 ? <span>{order.shippingLine2}</span> : null}
                <span>{[order.shippingCity, order.shippingRegion, order.shippingPostalCode].filter(Boolean).join(', ')}</span>
                <span>{order.shippingCountry}</span>
                <span>{order.shippingEmail}</span>
              </address>
            </>
          ) : null}
          <h2>Items</h2>
          <ul className="order-lines">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt ?? item.productName} width="72" height="72" /> : null}
                <span>{item.productName} x {item.quantity}</span>
                <strong>{formatPrice(item.totalMinor)}</strong>
              </li>
            ))}
          </ul>
          {order.paymentStatus !== 'SUCCEEDED' ? (
            <p className="form-status">We are confirming your payment. This page will update automatically.</p>
          ) : null}
        </div>
      ) : (
        <p className="lead">We are preparing your order confirmation. This page will update automatically.</p>
      )}
      <a className="button" href="/shop">Continue shopping</a>
    </section>
  );
}
