import React from 'react';
import { Container } from '@tcg-hobby/ui';

const SUPPORTED_PAYMENT_METHODS = ['Visa', 'Mastercard'] as const;

export function PaymentTrustBanner() {
  return (
    <section className="border-t border-surface-line/60 bg-surface-ink text-neutral-50" aria-label="Payment and checkout reassurance">
      <Container className="py-4">
        <div className="flex flex-col gap-3 text-sm text-neutral-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-semibold text-neutral-50">Secure checkout</span>
            <span className="text-neutral-500" aria-hidden="true">/</span>
            <span>Card payments are processed through Stripe.</span>
            <span className="text-neutral-500" aria-hidden="true">/</span>
            <span>VAT included in product prices.</span>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Supported payment methods">
            {SUPPORTED_PAYMENT_METHODS.map((method) => (
              <li key={method} className="rounded-md bg-surface-base px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-neutral-100 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                {method}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
