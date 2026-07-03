import { randomBytes } from 'node:crypto';

export type SessionRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: SessionRole;
};

export type CustomerSession = {
  id: string;
  user: SessionUser;
  expires: Date;
};

export const SESSION_COOKIE_NAME = 'tcg_hobby_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function createSessionExpiry(now = Date.now()) {
  return new Date(now + SESSION_DURATION_MS);
}

export function canAccessAdmin(user: SessionUser): boolean {
  return user.role === 'ADMIN' || user.role === 'STAFF';
}

export function canAccessCustomerAccount(user: SessionUser): boolean {
  return user.role === 'CUSTOMER';
}

export function requireCustomerAccount(user: SessionUser | null | undefined): SessionUser {
  if (!user || !canAccessCustomerAccount(user)) {
    throw new Error('Customer account access required');
  }

  return user;
}

