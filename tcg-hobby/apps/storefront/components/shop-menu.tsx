'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@tcg-hobby/ui';

type ShopLink = {
  label: string;
  href: string;
  description: string;
};

const shopLinks: ShopLink[] = [
  { label: 'Pokémon', href: '/catalogue?search=Pokemon', description: 'Singles, sealed products, and more.' },
  { label: 'Magic: The Gathering', href: '/catalogue?search=Magic', description: 'Singles, sealed products, and more.' },
  { label: 'Yu-Gi-Oh!', href: '/catalogue?search=Yu-Gi-Oh', description: 'Singles, sealed products, and more.' },
  { label: 'One Piece', href: '/catalogue?search=One Piece', description: 'Singles, sealed products, and more.' },
  { label: 'Accessories', href: '/catalogue?category=accessories', description: 'Sleeves, binders, cases, and more.' },
  { label: 'Sealed Products', href: '/catalogue?category=sealed-product', description: 'Booster boxes, tins, and boxes.' },
  { label: 'Pre-orders', href: '/releases', description: 'Reserve upcoming launches early.' },
  { label: 'Coming Soon', href: '/coming-soon', description: 'What is next for the store.' },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

export function ShopMenu() {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');

    const update = () => setIsDesktop(media.matches);
    update();

    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const width = Math.min(820, window.innerWidth - 32);
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - width / 2),
      Math.max(16, window.innerWidth - width - 16),
    );

    setMenuPosition({
      top: rect.bottom + 14,
      left,
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open || !isDesktop) {
      return;
    }

    updateMenuPosition();
  }, [open, isDesktop, updateMenuPosition]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!isDesktop) {
        return;
      }

      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleResize = () => updateMenuPosition();

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open, isDesktop, updateMenuPosition]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const close = () => setOpen(false);

  const desktopMenu =
    open && isDesktop && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close shop menu"
              className="cursor-default bg-black/55 backdrop-blur-[1px]"
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={close}
            />
            <div
              id="shop-menu-panel"
              ref={menuRef}
              role="menu"
              aria-label="Shop"
              className="rounded-2xl border border-surface-line bg-surface-ink p-4 shadow-glow"
              style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: menuPosition.width, zIndex: 50 }}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-surface-line bg-surface-base/60 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Games</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {shopLinks.slice(0, 4).map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={close}
                        className="rounded-lg border border-surface-line/80 bg-black/20 p-4 transition-colors hover:border-accent/40 hover:bg-surface-panel focus:outline-none focus:ring-2 focus:ring-accent"
                        role="menuitem"
                      >
                        <span className="block text-sm font-semibold text-neutral-50">{link.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-400">{link.description}</span>
                      </a>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-surface-line bg-surface-base/60 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Store</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {shopLinks.slice(4).map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        onClick={close}
                        className="rounded-lg border border-surface-line/80 bg-black/20 p-4 transition-colors hover:border-accent/40 hover:bg-surface-panel focus:outline-none focus:ring-2 focus:ring-accent"
                        role="menuitem"
                      >
                        <span className="block text-sm font-semibold text-neutral-50">{link.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-neutral-400">{link.description}</span>
                      </a>
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-4 border-t border-surface-line pt-4 text-center">
                <a
                  href="/catalogue"
                  onClick={close}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  View all products <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  const mobileMenu = open && !isDesktop ? (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close shop menu"
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={close}
      />
      <div className="absolute left-0 top-0 h-full w-[88vw] max-w-sm border-r border-surface-line bg-surface-ink shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Shop</p>
            <p className="text-sm text-neutral-400">Browse our store</p>
          </div>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close shop menu">
            <span className="text-lg leading-none">×</span>
          </Button>
        </div>
        <div className="space-y-2 overflow-y-auto p-4">
          {shopLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={close}
              className="flex items-center justify-between rounded-xl border border-surface-line bg-surface-base px-4 py-3 transition-colors hover:border-accent hover:bg-surface-panel focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <span className="block text-sm font-semibold text-neutral-50">{link.label}</span>
              <span aria-hidden="true" className="text-lg leading-none text-neutral-500">›</span>
            </a>
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
        className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-surface-base/80 px-3 py-2 text-sm font-semibold text-neutral-50 transition-colors hover:border-accent hover:text-accent-soft focus:outline-none focus:ring-2 focus:ring-accent"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="shop-menu-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <MenuIcon />
        <span>Shop</span>
        <ChevronDownIcon />
      </button>

      {desktopMenu}
      {mobileMenu}
    </div>
  );
}
