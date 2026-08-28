import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CheckoutSuccessClient, ironSprueCheckoutResultState } from './checkout-success-client';

describe('Iron Sprue checkout result state', () => {
  it('keeps internal payment states in a customer-facing processing state', () => {
    expect(ironSprueCheckoutResultState(undefined)).toBe('processing');
    expect(ironSprueCheckoutResultState('REQUIRES_PAYMENT')).toBe('processing');
    expect(ironSprueCheckoutResultState('PROCESSING')).toBe('processing');
    expect(ironSprueCheckoutResultState('REQUIRES_CONFIRMATION')).toBe('processing');
  });

  it('maps definitive payment states to customer result states', () => {
    expect(ironSprueCheckoutResultState('SUCCEEDED')).toBe('success');
    expect(ironSprueCheckoutResultState('FAILED')).toBe('failure');
    expect(ironSprueCheckoutResultState('CANCELED')).toBe('failure');
    expect(ironSprueCheckoutResultState('CANCELLED')).toBe('failure');
    expect(ironSprueCheckoutResultState('EXPIRED')).toBe('failure');
  });

  it('renders paid order confirmation without exposing invoice details', () => {
    const markup = renderToStaticMarkup(<CheckoutSuccessClient
      checkoutReference="cs_test_1"
      initialOrder={{
        orderNumber: 'IS-20260824-ABC123',
        paymentStatus: 'SUCCEEDED',
        fulfilmentStatus: 'PENDING',
        currency: 'GBP',
        subtotalMinor: 1999,
        shippingMinor: 399,
        taxMinor: 400,
        totalMinor: 2398,
        itemCount: 1,
        createdAt: '2026-08-24T10:00:00.000Z',
        shippingMethodName: 'Standard delivery',
        items: [{
          id: 'item-1',
          productId: 'product-1',
          productName: 'Toyota 2000GT Red',
          productSlug: 'toyota-2000gt-red',
          productSku: 'IS-AOS-05628',
          quantity: 1,
          unitPriceMinor: 1999,
          totalMinor: 1999,
        }],
        invoice: {
          invoiceNumber: 'IS-VAT-2026-000001',
          invoiceDate: '2026-08-24T10:00:00.000Z',
          sellerLegalName: 'Capital Hobby Group Ltd',
          sellerCompanyNumber: '17336948',
          sellerVatNumber: '525 2040 33',
          sellerRegisteredOffice: '4-6 Greatorex Street, London, United Kingdom, E1 5NF',
          customerName: 'Test Customer',
          customerEmail: 'test@example.test',
          billingLine1: '1 Test Street',
          billingCity: 'London',
          billingPostalCode: 'E1 5NF',
          billingCountry: 'GB',
          subtotalNetMinor: 1666,
          subtotalVatMinor: 333,
          subtotalGrossMinor: 1999,
          shippingNetMinor: 332,
          shippingVatMinor: 67,
          shippingGrossMinor: 399,
          discountNetMinor: 0,
          discountVatMinor: 0,
          discountGrossMinor: 0,
          orderNetTotalMinor: 1998,
          vatTotalMinor: 400,
          grossTotalMinor: 2398,
          currency: 'GBP',
          lines: [],
        },
      }}
    />);

    expect(markup).toContain('Order <span class="order-reference-heading">IS-20260824-ABC123</span> confirmed');
    expect(markup).toContain('Thank you. Your payment has been received and your order is now confirmed.');
    expect(markup).toContain('Continue shopping');
    expect(markup).not.toContain('IS-VAT-2026-000001');
    expect(markup).not.toContain('VAT No.');
    expect(markup).not.toContain('Net total');
  });
});
