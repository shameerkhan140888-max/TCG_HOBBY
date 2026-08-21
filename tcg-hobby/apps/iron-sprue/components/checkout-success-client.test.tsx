import { describe, expect, it } from 'vitest';
import { ironSprueCheckoutResultState } from './checkout-success-client';

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
});
