import React from 'react';
import Image from 'next/image';
import { Container } from '@tcg-hobby/ui';
import { getEnabledPaymentMethods, storefrontPaymentMethods, type PaymentMethodConfig } from '../lib/payment-methods';

type PaymentTrustBannerProps = {
  methods?: readonly PaymentMethodConfig[];
};

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-accent">
      <path
        fill="currentColor"
        d="M17 9V7a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1Zm-8 0V7a3 3 0 0 1 6 0v2H9Zm3 4a1.5 1.5 0 0 1 .75 2.8V18h-1.5v-2.2A1.5 1.5 0 0 1 12 13Z"
      />
    </svg>
  );
}

function PaymentMark({ method }: { method: PaymentMethodConfig }) {
  return (
    <span
      className="inline-flex h-9 min-w-16 items-center justify-center rounded-md bg-neutral-50 px-3 text-xs font-black tracking-[0.08em] text-neutral-950 shadow-[0_12px_28px_rgba(0,0,0,0.28)] ring-1 ring-white/70"
      aria-label={method.label}
      title={method.label}
    >
      {method.assetPath ? (
        <Image src={method.assetPath} width={86} height={36} alt={method.label} className="max-h-6 w-auto object-contain" />
      ) : (
        method.displayLabel
      )}
    </span>
  );
}

export function PaymentTrustBanner({ methods = storefrontPaymentMethods }: PaymentTrustBannerProps) {
  const enabledMethods = getEnabledPaymentMethods(methods);

  return (
    <section className="border-t border-accent/20 bg-surface-ink text-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" aria-label="Payment and checkout reassurance">
      <Container className="py-3">
        <div className="flex flex-col gap-3 text-sm text-neutral-300 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1.5">
            <span className="inline-flex items-center gap-2 font-semibold text-neutral-50">
              <LockIcon />
              Secure checkout
            </span>
            <span>Card payments are securely processed by Stripe.</span>
            <span>VAT included in product prices.</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Accepted payments</span>
            <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
              {enabledMethods.map((method) => (
                <li key={method.id}>
                  <PaymentMark method={method} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
