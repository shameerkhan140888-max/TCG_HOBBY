import React from 'react';
import Link from 'next/link';
import { Container } from '@tcg-hobby/ui';
import { getCurrentCustomerSession } from '../lib/auth';
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

export async function SiteHeader() {
  const session = await getCurrentCustomerSession();
  const authenticated = session?.user.role === 'CUSTOMER';
  const accountHref = authenticated ? '/account' : '/login';

  return (
    <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/95 backdrop-blur">
      <Container className="flex min-h-[76px] items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link href="/" className="flex flex-none items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
            <span className="flex flex-col leading-none tracking-tight">
              <span className="text-[18px] font-extrabold text-white sm:text-[20px]">TCG</span>
              <span className="-mt-0.5 text-[16px] font-extrabold tracking-[0.22em] text-orange-500 sm:text-[18px]">
                HOBBY
              </span>
            </span>
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
        </div>
      </Container>
    </header>
  );
}
