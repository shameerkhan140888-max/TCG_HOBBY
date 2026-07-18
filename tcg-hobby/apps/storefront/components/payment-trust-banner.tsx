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
      className="inline-flex h-7 items-center justify-center"
      aria-label={method.label}
      title={method.label}
    >
      {method.assetPath ? (
        <Image src={method.assetPath} width={72} height={28} alt={method.label} className="h-6 w-auto object-contain" />
      ) : (
        <span className="text-xs font-black tracking-[0.08em] text-neutral-50">{method.displayLabel}</span>
      )}
    </span>
  );
}

export function PaymentTrustBanner({ methods = storefrontPaymentMethods }: PaymentTrustBannerProps) {
  const enabledMethods = getEnabledPaymentMethods(methods);

  return (
    <section className="border-t border-accent/20 bg-surface-ink text-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" aria-label="Payment and checkout reassurance">
      <Container className="py-4 sm:py-5">
        <div className="flex flex-col gap-3 text-sm leading-6 text-neutral-300 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-8 lg:gap-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-50 sm:text-base">
              <LockIcon />
              Secure checkout
            </span>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-semibold text-neutral-100">Accepted payments:</span>
              <ul className="flex flex-wrap items-center gap-2.5" aria-label="Accepted payment methods">
                {enabledMethods.map((method) => (
                  <li key={method.id}>
                    <PaymentMark method={method} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-neutral-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <span>Card payments are securely processed by Stripe.</span>
            <span>VAT included in product prices.</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
