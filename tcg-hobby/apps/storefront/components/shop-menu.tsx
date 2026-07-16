'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';

type ShopLink = {
  label: string;
  href: string;
  description: string;
};

const shopLinks: ShopLink[] = [
  { label: 'Pokémon', href: '/catalogue?q=Pokemon', description: 'Sealed products, singles and collector essentials.' },
  { label: 'Magic: The Gathering', href: '/catalogue?q=Magic', description: 'New releases, sealed products and play-ready picks.' },
  { label: 'Yu-Gi-Oh!', href: '/catalogue?q=Yu-Gi-Oh', description: 'Core sets, sealed products and player essentials.' },
  { label: 'One Piece', href: '/catalogue?q=One+Piece', description: 'Upcoming releases and sealed products.' },
  { label: 'Sealed Products', href: '/catalogue?category=sealed-product', description: 'Booster boxes, tins and collections.' },
  { label: 'Accessories', href: '/catalogue?category=accessories', description: 'Sleeves, binders, cases and protection.' },
  { label: 'Pre-orders', href: '/releases', description: 'Reserve upcoming launches early.' },
  { label: 'Coming Soon', href: '/coming-soon', description: 'What is next for the store.' },
];

export const shopMenuGroups = [
  { title: 'Games', links: shopLinks.slice(0, 4) },
  { title: 'Store', links: shopLinks.slice(4) },
] as const;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

function HamburgerIcon() {
  return (
    <span className="grid gap-1.5" aria-hidden="true">
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
      <span className="block h-0.5 w-5 rounded-full bg-current" />
    </span>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MenuLinkCard({ link, onNavigate }: { link: ShopLink; onNavigate: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className="group block rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.045] focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <span className="block text-sm font-semibold text-neutral-50 transition-colors group-hover:text-accent-soft">{link.label}</span>
      <span className="mt-1 block text-xs leading-5 text-neutral-400">{link.description}</span>
    </Link>
  );
}

export function ShopMenu() {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(720, window.innerWidth - 32);
    const left = Math.min(
      Math.max(16, rect.left - 12),
      Math.max(16, window.innerWidth - width - 16),
    );

    setMenuPosition({
      top: rect.bottom + 8,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (open && desktop) {
      updateMenuPosition();
    }
  }, [desktop, open, updateMenuPosition]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const clickedMenu = menuRef.current?.contains(target) ?? false;
      const clickedTrigger = buttonRef.current?.contains(target) ?? false;
      if (!clickedMenu && !clickedTrigger) {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const close = () => {
    cancelClose();
    setOpen(false);
  };

  const openMenu = () => {
    cancelClose();
    setOpen(true);
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 180);
  };

  const desktopMenu =
    open && desktop && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close shop menu"
              className="fixed inset-0 cursor-default bg-transparent"
              onClick={close}
            />
            <div
              ref={menuRef}
              id="shop-menu-panel"
              role="menu"
              aria-label="Shop"
              className="fixed z-50 overflow-hidden rounded-2xl bg-[#09090b]/[0.98] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.46),0_0_0_1px_rgba(255,122,26,0.14),0_-1px_0_rgba(255,122,26,0.28)] backdrop-blur-xl"
              style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="grid gap-6 lg:grid-cols-2">
                {shopMenuGroups.map((group, index) => (
                  <section key={group.title} className={index === 1 ? 'lg:border-l lg:border-white/10 lg:pl-6' : undefined}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">{group.title}</p>
                    <div className="grid gap-1">
                      {group.links.map((link) => (
                        <MenuLinkCard key={link.label} link={link} onNavigate={close} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="mt-4 pt-4">
                <Link
                  href="/catalogue"
                  onClick={close}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  View all products <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  const mobileMenu = open && !desktop ? (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close shop menu"
        className="absolute inset-0 bg-black/65"
        onClick={close}
      />

      <div className="absolute left-0 top-0 h-full w-[min(88vw,24rem)] overflow-y-auto border-r border-surface-line bg-surface-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Shop</p>
            <p className="text-sm text-neutral-400">Browse the store</p>
          </div>
          <button
            type="button"
            aria-label="Close shop menu"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition hover:bg-surface-panel hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-2 p-4">
          {shopLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={close}
              className="flex items-center justify-between rounded-xl border border-surface-line bg-surface-base px-4 py-3 transition-colors hover:border-accent hover:bg-surface-panel focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <span className="block text-sm font-semibold text-neutral-50">{link.label}</span>
              <span aria-hidden="true" className="text-lg leading-none text-neutral-500">
                &rsaquo;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open shop menu"
        aria-expanded={open}
        aria-controls="shop-menu-panel"
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={() => {
          if (desktop) {
            openMenu();
          }
        }}
        onMouseLeave={() => {
          if (desktop) {
            scheduleClose();
          }
        }}
        className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-md border border-white/15 text-white transition hover:border-orange-500 hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      >
        <HamburgerIcon />
      </button>

      {desktopMenu}
      {mobileMenu}
    </div>
  );
}
