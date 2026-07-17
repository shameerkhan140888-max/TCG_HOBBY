import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentTrustBanner } from './payment-trust-banner';

describe('PaymentTrustBanner', () => {
  it('renders accurate storefront payment reassurance without unsupported methods', () => {
    const markup = renderToStaticMarkup(<PaymentTrustBanner />);

    expect(markup).toContain('Payment and checkout reassurance');
    expect(markup).toContain('Secure checkout');
    expect(markup).toContain('Card payments are processed through Stripe.');
    expect(markup).toContain('VAT included in product prices.');
    expect(markup).toContain('Visa');
    expect(markup).toContain('Mastercard');
    expect(markup).not.toContain('PayPal');
    expect(markup).not.toContain('American Express');
  });
});
