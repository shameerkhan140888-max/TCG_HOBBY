import { describe, expect, it } from 'vitest';
import {
  canAccessAdmin,
  canAccessCustomerAccount,
  createSessionExpiry,
  generateSessionToken,
  LEGACY_SESSION_COOKIE_NAME,
  requireCustomerAccount,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAMES,
} from './session';

describe('session helpers', () => {
  it('generates unique session tokens and expiry windows', () => {
    const token = generateSessionToken();
    const expiry = createSessionExpiry(0);

    expect(token.length).toBeGreaterThan(30);
    expect(expiry).toBeInstanceOf(Date);
  });

  it('uses CHG session cookies while accepting the legacy TCG cookie during migration', () => {
    expect(SESSION_COOKIE_NAME).toBe('chg_session');
    expect(LEGACY_SESSION_COOKIE_NAME).toBe('tcg_hobby_session');
    expect(SESSION_COOKIE_NAMES).toEqual(['chg_session', 'tcg_hobby_session']);
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
