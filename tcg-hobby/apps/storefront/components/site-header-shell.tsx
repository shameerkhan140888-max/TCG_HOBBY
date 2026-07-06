'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandMark, Container } from '@tcg-hobby/ui';

type HeaderLink = {
  label: string;
  href: string;
};

type SiteHeaderShellProps = {
  authenticated: boolean;
};

const shopLinks: HeaderLink[] = [
  { label: 'New Releases', href: '/releases' },
  { label: 'Sealed Products', href: '/catalogue?category=sealed-products' },
  { label: 'Singles', href: '/catalogue?category=singles' },
  { label: 'Grading', href: '/catalogue?category=grading' },
  { label: 'Accessories', href: '/catalogue?category=accessories' },
  { label: 'TCG Supplies', href: '/catalogue?category=supplies' },
  { label: 'Deals', href: '/catalogue?category=deals' },
];

function LogoMark() {
  return <BrandMark width={170} height={56} className="block h-auto w-[112px] object-contain sm:w-[150px] lg:w-[170px]" />;
}

function HamburgerIcon() {
  return (
    <span className="grid gap-1.5" aria-hidden="true">
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
    </span>
  );
}

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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuLinkRow({ link, onNavigate }: { link: HeaderLink; onNavigate: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="flex items-center justify-between border-b border-surface-line px-4 py-3 text-sm text-neutral-50 transition-colors last:border-b-0 hover:bg-surface-panel focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <span>{link.label}</span>
      <span aria-hidden="true" className="text-lg leading-none text-neutral-500">
        &gt;
      </span>
    </Link>
  );
}

export function SiteHeaderShell({ authenticated }: SiteHeaderShellProps) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const clickedHeader = headerRef.current?.contains(target) ?? false;
      const clickedMenu = menuPanelRef.current?.contains(target) ?? false;
      const clickedTrigger = menuButtonRef.current?.contains(target) ?? false;

      if (!clickedHeader && !clickedMenu && !clickedTrigger) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const accountHref = authenticated ? '/account' : '/login';

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-surface-line bg-surface-ink/95 backdrop-blur">
      <Container className="relative flex min-h-[76px] items-center gap-4 py-3 sm:gap-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          <Link href="/" className="flex flex-none items-center focus:outline-none focus:ring-2 focus:ring-accent">
            <LogoMark />
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open shop menu"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-11 w-[2.75rem] min-w-[2.75rem] flex-none items-center justify-center rounded-md border border-white/15 text-white transition hover:border-orange-500 hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <HamburgerIcon />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/catalogue"
            aria-label="Search"
            className="hidden h-10 w-10 items-center justify-center text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent md:inline-flex"
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

        {open && desktop ? (
          <div className="absolute left-4 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))]">
            <div
              ref={menuPanelRef}
              className="overflow-hidden rounded-2xl border border-surface-line bg-surface-ink shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
            >
              <div className="flex items-center justify-between border-b border-surface-line px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Shop</p>
                  <p className="text-sm text-neutral-400">Browse the store</p>
                </div>
                <button
                  type="button"
                  aria-label="Close shop menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition hover:bg-surface-panel hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="py-2">
                {shopLinks.map((link) => (
                  <MenuLinkRow key={link.label} link={link} onNavigate={() => setOpen(false)} />
                ))}
              </nav>
            </div>
          </div>
        ) : null}

        {open && !desktop ? (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              aria-label="Close shop menu"
              className="absolute inset-0 bg-black/65"
              onClick={() => setOpen(false)}
            />

            <div
              ref={menuPanelRef}
              className="absolute left-0 top-0 h-full w-[min(88vw,24rem)] overflow-y-auto border-r border-surface-line bg-surface-ink shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Shop</p>
                  <p className="text-sm text-neutral-400">Browse the store</p>
                </div>
                <button
                  type="button"
                  aria-label="Close shop menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition hover:bg-surface-panel hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <CloseIcon />
                </button>
              </div>

              <nav className="py-2">
                {shopLinks.map((link) => (
                  <MenuLinkRow key={link.label} link={link} onNavigate={() => setOpen(false)} />
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </Container>
    </header>
  );
}
