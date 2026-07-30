import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/products',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('../lib/auth-actions.server', () => ({
  logoutAdminAction: vi.fn(),
}));

import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  it('renders compact grouped navigation with current-page and mobile controls', () => {
    const markup = renderToStaticMarkup(
      <AdminShell user={{ id: 'admin-1', email: 'admin@example.test', name: 'Admin User', role: 'ADMIN' }}>
        <main>Admin content</main>
      </AdminShell>,
    );

    for (const group of ['Overview', 'Catalogue', 'Commerce', 'Marketing', 'Operations']) {
      expect(markup).toContain(group);
    }
    for (const href of ['/admin/products', '/admin/releases', '/admin/catalogue', '/admin/inventory', '/admin/orders', '/admin/buylist', '/admin/storefront', '/admin/marketing/subscribers', '/admin/marketing/campaigns', '/admin/suppliers']) {
      expect(markup).toContain(`href="${href}"`);
    }
    expect(markup).toContain('href="/admin/products" aria-current="page"');
    expect(markup).toContain('aria-label="Open Admin navigation"');
    expect(markup).toContain('aria-label="Close Admin navigation"');
    expect(markup).toContain('aria-label="Collapse Admin navigation"');
    expect(markup).toContain('lg:grid-cols-[248px_minmax(0,1fr)]');
    expect(markup).toContain('data-admin-nav-icon="true"');
    expect(markup).toContain('style="width:20px;height:20px"');
    expect(markup).toContain('Admin User');
    expect(markup).toContain('Sign out');
  });
});
