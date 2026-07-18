import React from 'react';
import { Container } from '@tcg-hobby/ui';
import { getEnabledPaymentMethods, storefrontPaymentMethods, type PaymentMethodConfig } from '../lib/payment-methods';

type PaymentTrustBannerProps = {
  methods?: readonly PaymentMethodConfig[];
};

function LockIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-accent">
      <path
        fill="currentColor"
        d="M17 9V7a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1Zm-8 0V7a3 3 0 0 1 6 0v2H9Zm3 4a1.5 1.5 0 0 1 .75 2.8V18h-1.5v-2.2A1.5 1.5 0 0 1 12 13Z"
      />
    </svg>
  );
}

function PaymentLogo({ method }: { method: PaymentMethodConfig }) {
  if (!method.assetPath) {
    return <span className="text-sm font-semibold text-neutral-100">{method.displayLabel}</span>;
  }

  const heightClass = method.id === 'mastercard' ? 'h-[26px] max-sm:h-5' : 'h-[22px] max-sm:h-4';

  return <img src={method.assetPath} alt="" aria-hidden="true" className={`block ${heightClass} w-auto shrink-0 object-contain`} loading="lazy" decoding="async" />;
}

export function PaymentTrustBanner({ methods = storefrontPaymentMethods }: PaymentTrustBannerProps) {
  const enabledMethods = getEnabledPaymentMethods(methods);

  return (
    <section className="bg-neutral-950 text-neutral-100" aria-label="Payment and checkout reassurance">
      <Container className="py-3">
        <div className="grid gap-3 text-sm leading-6 text-neutral-300 md:grid-cols-[auto_1fr] md:items-center xl:grid-cols-[auto_auto_1fr_auto] xl:gap-8">
          <div className="inline-flex items-center gap-2 font-semibold text-neutral-50">
            <LockIcon />
            <span>Secure checkout</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Accepted payment methods">
            <span className="font-semibold text-neutral-50">Accepted payments:</span>
            <ul className="flex flex-wrap items-center gap-4">
              {enabledMethods.map((method) => (
                <li key={method.id} className="inline-flex items-center" aria-label={method.label}>
                  <PaymentLogo method={method} />
                </li>
              ))}
            </ul>
          </div>

          <p className="text-neutral-400">Card payments are securely processed by Stripe.</p>
          <p className="text-neutral-400">VAT included in product prices.</p>
        </div>
      </Container>
    </section>
  );
}
