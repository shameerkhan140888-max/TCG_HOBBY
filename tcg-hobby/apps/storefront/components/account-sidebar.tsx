'use client';

import { usePathname } from 'next/navigation';
import { AccountNav } from '@tcg-hobby/ui';
import type { logoutCustomerAction } from '../lib/auth-actions';

const items = [
  { href: '/account', label: 'Overview' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
];

export function AccountSidebar({ logoutAction }: { logoutAction: typeof logoutCustomerAction }) {
  const pathname = usePathname();

  return <AccountNav items={items} activeHref={pathname} logoutAction={logoutAction} />;
}
