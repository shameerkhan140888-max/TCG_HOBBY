'use client';

import { useEffect, useState } from 'react';
import type { PublicOrderDetail } from '@tcg-hobby/types';
import {
  hasTrackedIronSpruePurchase,
  markIronSpruePurchaseTracked,
  trackIronSprueEcommerceEvent,
} from '../lib/analytics';
import { clearIronSprueBasketAfterPaidCheckout } from './basket-client';

function formatPrice(minor: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(minor / 100);
}

function isPaymentFailure(status: string | undefined) {
  return status === 'FAILED' || status === 'CANCELED' || status === 'CANCELLED' || status === 'EXPIRED';
}

export function ironSprueCheckoutResultState(status: string | undefined) {
  if (status === 'SUCCEEDED') return 'success';
  if (isPaymentFailure(status)) return 'failure';
  return 'processing';
}

function isPaymentFinal(status: string | undefined) {
  return ironSprueCheckoutResultState(status) !== 'processing';
}

export function CheckoutSuccessClient({
  initialOrder,
  checkoutReference,
  referenceType = 'session',
}: {
  initialOrder: PublicOrderDetail | null;
  checkoutReference: string;
  referenceType?: 'session' | 'payment-intent';
}) {
  const [order, setOrder] = useState<PublicOrderDetail | null>(initialOrder);
  const [hasClearedBasket, setHasClearedBasket] = useState(false);
  const [hasTrackedPurchase, setHasTrackedPurchase] = useState(false);
  const resultState = ironSprueCheckoutResultState(order?.paymentStatus);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function refreshOrder() {
      try {
        const path = referenceType === 'payment-intent'
          ? `/api/checkout/payment-status/${encodeURIComponent(checkoutReference)}`
          : `/api/checkout/status/${encodeURIComponent(checkoutReference)}`;
        const response = await fetch(path, { cache: 'no-store' });
        if (response.ok) {
          const nextOrder = await response.json() as PublicOrderDetail;
          if (!cancelled) setOrder(nextOrder);
          if (isPaymentFinal(nextOrder.paymentStatus)) return;
        }
      } catch {
        // Keep the success page readable while the webhook/API catches up.
      }

      if (!cancelled) timeout = setTimeout(refreshOrder, 2500);
    }

    if (!isPaymentFinal(order?.paymentStatus)) timeout = setTimeout(refreshOrder, 1500);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [checkoutReference, order?.paymentStatus, referenceType]);

  useEffect(() => {
    if (resultState !== 'processing') return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [resultState]);

  useEffect(() => {
    if (order?.paymentStatus === 'SUCCEEDED' && !hasClearedBasket) {
      void clearIronSprueBasketAfterPaidCheckout();
      setHasClearedBasket(true);
    }
  }, [hasClearedBasket, order?.paymentStatus]);

  useEffect(() => {
    if (!order || order.paymentStatus !== 'SUCCEEDED' || hasTrackedPurchase) return;
    if (hasTrackedIronSpruePurchase(order.orderNumber)) {
      setHasTrackedPurchase(true);
      return;
    }
    trackIronSprueEcommerceEvent('purchase', {
      transaction_id: order.orderNumber,
      currency: order.currency,
      value: order.totalMinor / 100,
      tax: order.taxMinor / 100,
      shipping: order.shippingMinor / 100,
      coupon: order.discountCode ?? undefined,
      items: order.items.map((item) => ({
        item_id: item.productSku,
        item_name: item.productName,
        quantity: item.quantity,
        price: item.unitPriceMinor / 100,
      })),
    });
    markIronSpruePurchaseTracked(order.orderNumber);
    setHasTrackedPurchase(true);
  }, [hasTrackedPurchase, order]);

  return (
    <section className="section-block checkout-result-page">
      <p className="eyebrow">Iron Sprue checkout</p>
      {!order || ironSprueCheckoutResultState(order.paymentStatus) === 'processing' ? (
        <div className="checkout-processing-card" role="status" aria-live="polite">
          <span className="payment-spinner" aria-hidden="true" />
          <h1>Processing your payment.</h1>
          <p className="lead">Please wait while we securely confirm your payment.</p>
          <p className="form-status notice">Please do not refresh or close this page while payment is being confirmed.</p>
        </div>
      ) : ironSprueCheckoutResultState(order.paymentStatus) === 'failure' ? (
        <>
          <h1>Payment not completed.</h1>
          <div className="checkout-result-card">
            <p className="lead">Your payment was not completed. Your basket can be reviewed before trying again.</p>
          </div>
        </>
      ) : (
        <>
        <h1>Order confirmed.</h1>
        <div className="checkout-result-card">
          <p className="lead">Order {order.orderNumber}</p>
          <p className="form-status notice">Payment received. Your Iron Sprue order is confirmed.</p>
          <h2>Items</h2>
          <ul className="order-lines">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt ?? item.productName} width="72" height="72" /> : null}
                <span>
                  <strong>{item.productName}</strong>
                  <small>Qty {item.quantity} · {formatPrice(item.unitPriceMinor)} each</small>
                </span>
                <strong>{formatPrice(item.totalMinor)}</strong>
              </li>
            ))}
          </ul>
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
          <h2>Order summary</h2>
          <dl className="receipt-summary">
            <div><dt>Payment</dt><dd>Paid</dd></div>
            <div><dt>Order status</dt><dd>Confirmed</dd></div>
            <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotalMinor)}</dd></div>
            <div><dt>Delivery</dt><dd>{formatPrice(order.shippingMinor)}</dd></div>
            {(order.discountMinor ?? 0) > 0 ? <div><dt>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</dt><dd>-{formatPrice(order.discountMinor ?? 0)}</dd></div> : null}
            <div><dt>VAT included</dt><dd>{formatPrice(order.taxMinor)}</dd></div>
            <div className="receipt-total"><dt>Total</dt><dd>{formatPrice(order.totalMinor)}</dd></div>
            <div><dt>Delivery method</dt><dd>{order.shippingMethodName}</dd></div>
          </dl>
        </div>
        </>
      )}
      <div className="hero-actions">
        {order && isPaymentFailure(order.paymentStatus) ? <a className="button" href="/checkout">Retry payment</a> : null}
        {resultState !== 'processing' ? <a className="button" href="/shop">Continue shopping</a> : null}
      </div>
    </section>
  );
}
