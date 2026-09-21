import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentMethodStrip } from './payment-method-strip';
import { getVisibleIronSpruePaymentMethods, ironSpruePaymentMethods } from '../lib/payment-methods';

describe('Iron Sprue payment method presentation', () => {
  it('shows only currently enabled payment methods by default', () => {
    const markup = renderToStaticMarkup(<PaymentMethodStrip />);

    expect(markup).toContain('/payments/visa.svg');
    expect(markup).toContain('/payments/mastercard.svg');
    expect(markup).toContain('/payments/american-express.svg');
    expect(markup).not.toContain('/payments/apple-pay.svg');
    expect(markup).not.toContain('/payments/google-pay.svg');
    expect(markup).not.toContain('PayPal');
    expect(markup).not.toContain('Klarna');
  });

  it('keeps wallet and PayPal methods configured-later while exposing the current card set', () => {
    expect(getVisibleIronSpruePaymentMethods().map((method) => method.id)).toEqual([
      'visa',
      'mastercard',
      'american-express',
    ]);
    expect(ironSpruePaymentMethods.find((method) => method.id === 'paypal')).toMatchObject({
      enabled: false,
      status: 'production-configuration-required',
    });
    expect(ironSpruePaymentMethods.find((method) => method.id === 'apple-pay')).toMatchObject({
      enabled: false,
      status: 'production-configuration-required',
    });
    expect(ironSpruePaymentMethods.find((method) => method.id === 'google-pay')).toMatchObject({
      enabled: false,
      status: 'production-configuration-required',
    });
  });

  it('keeps compact checkout strips logo-only', () => {
    const markup = renderToStaticMarkup(<PaymentMethodStrip compact />);

    expect(markup).toContain('/payments/visa.svg');
    expect(markup).not.toContain('Major cards');
    expect(markup).not.toContain('Secure payment');
    expect(markup).not.toContain('Secure payments');
  });
});
