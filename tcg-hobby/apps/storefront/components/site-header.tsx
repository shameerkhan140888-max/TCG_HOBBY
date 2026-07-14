import React from 'react';
import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';
import { getCurrentCustomerSession } from '../lib/auth';
import { getCurrentCustomerCart } from '../lib/cart';
import { ShopMenu } from './shop-menu';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M21 21l-4.35-4.35M10.75 17.5a6.75 6.75 0 1 1 0-13.5 6.75 6.75 0 0 1 0 13.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M20 20a8 8 0 0 0-16 0m12-11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M4.5 5.5h2.2l2.1 9.4a2 2 0 0 0 1.95 1.56h5.95a2 2 0 0 0 1.9-1.38l1.35-4.15H8.1M10 20a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm8 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export async function SiteHeader() {
  const [session, cart] = await Promise.all([getCurrentCustomerSession(), getCurrentCustomerCart()]);
  const authenticated = session?.user.role === 'CUSTOMER';
  const accountHref = authenticated ? '/account' : '/login';
  const basketCount = cart.totalItems;

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/95 backdrop-blur">
      <Container className="flex min-h-[76px] items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link href="/" className="flex flex-none items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
            <BrandMark width={160} height={56} className="w-[150px] object-contain sm:w-[160px]" />
          </Link>
          <ShopMenu />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/catalogue"
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <SearchIcon />
          </Link>

          <Link
            href={accountHref}
            aria-label={authenticated ? 'Account' : 'Log in'}
            className="inline-flex h-10 w-10 items-center justify-center text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <AccountIcon />
          </Link>

          <Link
            href="/cart"
            aria-label={`Cart${basketCount ? `, ${basketCount} item${basketCount === 1 ? '' : 's'}` : ''}`}
            className="relative inline-flex h-10 w-10 items-center justify-center text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <CartIcon />
            {basketCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold leading-none text-neutral-950">
                {basketCount > 99 ? '99+' : basketCount}
              </span>
            ) : null}
          </Link>
        </div>
      </Container>
    </header>
  );
}
