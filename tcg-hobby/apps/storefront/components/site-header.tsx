import React from 'react';
import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';
import { getCurrentCustomerSession } from '../lib/auth';
import { getCurrentCustomerCart } from '../lib/cart';
import { ShopMenu } from './shop-menu';
import { HeaderSearch } from './header-search';
import { getActiveStorefrontBanner } from '@tcg-hobby/database';

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

function BannerIcon({ icon }: { icon: string | null }) {
  if (!icon) return null;
  const paths: Record<string, React.ReactNode> = {
    DELIVERY: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>,
    PARCEL: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /></>,
    ANNOUNCEMENT: <><path d="m3 11 14-6v14L3 13v-2Z" /><path d="M7 14v6h4v-4" /></>,
    OFFER: <><path d="M20 13 11 22l-9-9V4h9l9 9Z" /><circle cx="7" cy="9" r="1" /></>,
    INFORMATION: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[icon] ?? paths.INFORMATION}
    </svg>
  );
}

export async function SiteHeader() {
  const [session, cart, banner] = await Promise.all([
    getCurrentCustomerSession(),
    getCurrentCustomerCart(),
    getActiveStorefrontBanner().catch(() => null),
  ]);
  const authenticated = session?.user.role === 'CUSTOMER';
  const accountHref = authenticated ? '/account' : '/login';
  const basketCount = cart.totalItems;

  return (
    <div className="sticky top-0 z-30" data-storefront-sticky-header>
    <header className="border-b border-surface-line bg-surface-ink/95 backdrop-blur">
      <Container className="flex min-h-[76px] items-center justify-between gap-4 py-3">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link href="/" className="flex flex-none items-center focus:outline-none focus:ring-2 focus:ring-accent" aria-label="TCG Hobby home">
            <BrandMark width={160} height={56} className="w-[150px] object-contain sm:w-[160px]" />
          </Link>
          <ShopMenu />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <HeaderSearch />

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
    {banner ? (
      <div className="border-b border-accent/25 bg-surface-ink/95 text-neutral-100 backdrop-blur" data-storefront-promotion>
        <Container className="flex min-h-10 flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-sm">
          <BannerIcon icon={banner.icon} />
          {banner.label ? <span className="font-bold text-accent-soft">{banner.label}</span> : null}
          <span>{banner.message}</span>
          {banner.ctaHref && banner.ctaLabel ? <Link href={banner.ctaHref} className="font-bold text-accent-soft underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-accent">{banner.ctaLabel}</Link> : null}
        </Container>
      </div>
    ) : null}
    </div>
  );
}
