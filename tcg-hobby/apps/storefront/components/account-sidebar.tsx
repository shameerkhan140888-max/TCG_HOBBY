'use client';

import { usePathname } from 'next/navigation';
import { AccountNav } from '@tcg-hobby/ui';
import type { logoutCustomerAction } from '../lib/auth-actions';

const items = [
  { href: '/account', label: 'Overview' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/notifications', label: 'Notifications' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/collection/insights', label: 'Insights' },
  { href: '/collection', label: 'Collection' },
  { href: '/decks', label: 'Decks' },
];

export function AccountSidebar({ logoutAction }: { logoutAction: typeof logoutCustomerAction }) {
  const pathname = usePathname();

  return <AccountNav items={items} activeHref={pathname} logoutAction={logoutAction} />;
}
