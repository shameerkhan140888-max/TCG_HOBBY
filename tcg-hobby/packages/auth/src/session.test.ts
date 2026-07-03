import { describe, expect, it } from 'vitest';
import { canAccessAdmin, canAccessCustomerAccount, createSessionExpiry, generateSessionToken, requireCustomerAccount } from './session';

describe('session helpers', () => {
  it('generates unique session tokens and expiry windows', () => {
    const token = generateSessionToken();
    const expiry = createSessionExpiry(0);

    expect(token.length).toBeGreaterThan(30);
    expect(expiry).toBeInstanceOf(Date);
  });

  it('restricts customer account access to customer users', () => {
    expect(
      canAccessCustomerAccount({
        id: 'user-1',
        email: 'sam.customer@tcghobby.test',
        name: 'Sam Collector',
        role: 'CUSTOMER',
      }),
    ).toBe(true);

    expect(
      canAccessCustomerAccount({
        id: 'user-2',
        email: 'ops@tcghobby.test',
        name: 'Operations Desk',
        role: 'STAFF',
      }),
    ).toBe(false);
  });

  it('keeps admin access available to staff and admins', () => {
    expect(
      canAccessAdmin({
        id: 'user-1',
        email: 'ops@tcghobby.test',
        name: 'Operations Desk',
        role: 'STAFF',
      }),
    ).toBe(true);
  });

  it('throws when a customer session is missing', () => {
    expect(() => requireCustomerAccount(null)).toThrow('Customer account access required');
  });
});
