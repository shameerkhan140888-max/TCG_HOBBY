'use client';

import type { SessionUser } from '@capital-hobby/auth';
import { BrandMark, Button } from '@capital-hobby/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { logoutAdminAction } from '../lib/auth-actions.server';

type NavIconName = 'dashboard' | 'products' | 'releases' | 'settings' | 'inventory' | 'orders' | 'buylist' | 'subscribers' | 'campaigns' | 'storefront' | 'suppliers';

const navGroups: Array<{
  label: string;
  items: Array<{ href: string; label: string; icon: NavIconName }>;
}> = [
  { label: 'Overview', items: [{ href: '/admin', label: 'Dashboard', icon: 'dashboard' }] },
  {
    label: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: 'products' },
      { href: '/admin/releases', label: 'Releases', icon: 'releases' },
      { href: '/admin/catalogue', label: 'Catalogue Settings', icon: 'settings' },
      { href: '/admin/inventory', label: 'Inventory', icon: 'inventory' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: 'orders' },
      { href: '/admin/buylist', label: 'Buylist', icon: 'buylist' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/storefront', label: 'Storefront', icon: 'storefront' },
      { href: '/admin/marketing/subscribers', label: 'Subscribers', icon: 'subscribers' },
      { href: '/admin/marketing/campaigns', label: 'Campaigns', icon: 'campaigns' },
    ],
  },
  { label: 'Operations', items: [{ href: '/admin/suppliers', label: 'Suppliers', icon: 'suppliers' }] },
];

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    products: <><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /></>,
    releases: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.01V3h4v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
    inventory: <><path d="M4 7h16v14H4zM2 3h20v4H2z" /><path d="M9 11h6" /></>,
    orders: <><path d="M6 3h12l2 4v14H4V7l2-4Z" /><path d="M4 8h16M9 12h6" /></>,
    buylist: <><path d="M4 6h16v14H4zM8 3h8v3H8z" /><path d="M8 11h8M8 15h5" /></>,
    subscribers: <><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0M16 8h6M19 5v6" /></>,
    campaigns: <><path d="m3 11 14-6v14L3 13v-2Z" /><path d="M7 14v6h4v-4" /></>,
    storefront: <><path d="M3 10h18l-2-6H5l-2 6Z" /><path d="M5 10v11h14V10M9 21v-6h6v6" /></>,
    suppliers: <><path d="M3 21V7l7-4v18M10 10l11-4v15H3" /><path d="M6 10h1M6 14h1M14 11h2M14 15h2" /></>,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-admin-nav-icon
      className="h-5 w-5 shrink-0"
      style={{ width: 20, height: 20 }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

export function AdminShell({ children, user }: { children: ReactNode; user: SessionUser }) {
  const pathname = usePathname() ?? '';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('tcg-admin-nav-collapsed') === 'true');
  }, []);

  const toggleCollapsed = () => setCollapsed((value) => {
    const next = !value;
    window.localStorage.setItem('tcg-admin-nav-collapsed', String(next));
    return next;
  });

  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [];
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <div className={`min-h-screen bg-surface-ink text-neutral-50 transition-[grid-template-columns] lg:grid ${collapsed ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[248px_minmax(0,1fr)]'}`}>
      {mobileOpen ? (
        <button type="button" aria-label="Close Admin navigation" className="fixed inset-0 z-40 bg-black/65 lg:hidden" onClick={() => {
          setMobileOpen(false);
          menuButtonRef.current?.focus();
        }} />
      ) : null}
      <aside
        ref={drawerRef}
        aria-label="Admin navigation"
        className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex w-[min(86vw,280px)] flex-col overflow-y-auto border-r border-surface-line bg-surface-base px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0`}
      >
        <div className="flex min-h-12 items-center justify-between gap-2 px-1">
          {collapsed ? <span className="hidden w-full text-center text-sm font-black text-accent lg:block">TCG</span> : <BrandMark width={160} height={56} className="w-[145px] object-contain" />}
          <button type="button" aria-label={collapsed ? 'Expand Admin navigation' : 'Collapse Admin navigation'} aria-expanded={!collapsed} onClick={toggleCollapsed} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-surface-line text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent lg:inline-flex">
            <span aria-hidden="true">{collapsed ? '>' : '<'}</span>
          </button>
          <button type="button" aria-label="Close Admin navigation" onClick={() => {
            setMobileOpen(false);
            menuButtonRef.current?.focus();
          }} className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-surface-line text-lg focus:outline-none focus:ring-2 focus:ring-accent lg:hidden">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <nav className="mt-5 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className={`${collapsed ? 'lg:sr-only' : ''} px-3 text-[11px] font-semibold uppercase text-neutral-500`}>{group.label}</p>
              <div className="mt-1 space-y-1">
                {group.items.map((item) => {
                  const active = item.href === '/admin'
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                        active ? 'bg-accent/15 font-semibold text-accent-soft' : 'text-neutral-300 hover:bg-surface-panel hover:text-neutral-50'
                      } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                    >
                      <NavIcon name={item.icon} />
                      <span className={collapsed ? 'lg:sr-only' : ''}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto pt-6">
          <div className={`${collapsed ? 'lg:px-0' : 'px-3'} border-t border-surface-line pt-4`}>
            <div className={collapsed ? 'lg:sr-only' : ''}>
              <p className="truncate text-sm font-semibold text-neutral-50">{user.name ?? user.email}</p>
              <p className="mt-1 text-xs uppercase text-neutral-500">{user.role}</p>
            </div>
            <form action={logoutAdminAction}>
              <Button className={`${collapsed ? 'lg:px-2' : 'w-full'} mt-3`} type="submit" variant="outline" size="sm" title={collapsed ? 'Sign out' : undefined}>
                <span className={collapsed ? 'lg:sr-only' : ''}>Sign out</span>
                {collapsed ? <span aria-hidden="true" className="hidden lg:inline">→</span> : null}
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="flex h-14 items-center border-b border-surface-line bg-surface-base px-4 lg:hidden">
          <button ref={menuButtonRef} type="button" aria-label="Open Admin navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="rounded-md border border-surface-line px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent">
            Menu
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
