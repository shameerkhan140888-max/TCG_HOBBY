import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentTrustBanner } from './payment-trust-banner';
import { getEnabledPaymentMethods, storefrontPaymentMethods, type PaymentMethodConfig } from '../lib/payment-methods';

describe('PaymentTrustBanner', () => {
  it('renders accurate storefront payment reassurance without unsupported methods', () => {
    const markup = renderToStaticMarkup(<PaymentTrustBanner />);

    expect(markup).toContain('Payment and checkout reassurance');
    expect(markup).toContain('Secure checkout');
    expect(markup).toContain('Card payments are securely processed by Stripe.');
    expect(markup).toContain('VAT included in product prices.');
    expect(markup).toContain('Accepted payments');
    expect(markup).toContain('aria-label="Accepted payment methods"');
    expect(markup).toContain('Visa');
    expect(markup).toContain('Mastercard');
    expect(markup).toContain('/payments/visa.svg');
    expect(markup).toContain('/payments/mastercard.svg');
    expect(markup.indexOf('Accepted payments')).toBeLessThan(markup.indexOf('/payments/visa.svg'));
    expect(markup.indexOf('/payments/visa.svg')).toBeLessThan(markup.indexOf('/payments/mastercard.svg'));
    expect(markup).toContain('h-6 w-auto object-contain');
    expect(markup).toContain('h-7 items-center justify-center');
    expect(markup).toContain('flex flex-wrap items-center gap-2.5');
    expect(markup).not.toContain('bg-white');
    expect(markup).not.toContain('ring-white');
    expect(markup).not.toContain('shadow-sm');
    expect(markup).not.toContain('bg-neutral-50');
    expect(markup).not.toContain('min-w-16');
    expect(markup).not.toContain('>|</span>');
    expect(markup).not.toContain('/payments/paypal.svg');
    expect(markup).not.toContain('>PayPal</span>');
    expect(markup).not.toContain('>Amex</span>');
  });

  it('renders only enabled configured payment methods in stable order', () => {
    const methods: PaymentMethodConfig[] = [
      { id: 'visa', label: 'Visa', displayLabel: 'VISA', assetPath: '/payments/visa.svg', enabled: true, processor: 'stripe-card' },
      { id: 'paypal', label: 'PayPal', displayLabel: 'PayPal', enabled: false, processor: 'paypal' },
      { id: 'klarna', label: 'Klarna', displayLabel: 'Klarna', enabled: true, processor: 'future' },
    ];
    const markup = renderToStaticMarkup(<PaymentTrustBanner methods={methods} />);

    expect(markup.indexOf('/payments/visa.svg')).toBeLessThan(markup.indexOf('Klarna'));
    expect(markup).toContain('aria-label="Visa"');
    expect(markup).toContain('aria-label="Klarna"');
    expect(markup).not.toContain('>PayPal</span>');
  });

  it('keeps future methods configurable but disabled by default', () => {
    expect(getEnabledPaymentMethods(storefrontPaymentMethods).map((method) => method.id)).toEqual(['visa', 'mastercard']);
    expect(storefrontPaymentMethods.some((method) => method.id === 'paypal' && !method.enabled)).toBe(true);
    expect(storefrontPaymentMethods.some((method) => method.id === 'klarna' && !method.enabled)).toBe(true);
    expect(storefrontPaymentMethods.some((method) => method.id === 'clearpay' && !method.enabled)).toBe(true);
  });
});
