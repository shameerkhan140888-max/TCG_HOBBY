export type SessionRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export type SessionUser = {
  id: string;
  email: string;
  role: SessionRole;
};

export function canAccessAdmin(user: SessionUser): boolean {
  return user.role === 'ADMIN' || user.role === 'STAFF';
}
