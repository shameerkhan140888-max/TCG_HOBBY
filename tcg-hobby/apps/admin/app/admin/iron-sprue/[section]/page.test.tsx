import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' } }),
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  getDashboard: vi.fn().mockResolvedValue({ storeCode: 'IRON_SPRUE' }),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
}));

vi.mock('../../../../lib/auth.server', () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock('@tcg-hobby/database', () => ({
  getIronSprueAdminDashboard: mocks.getDashboard,
  getIronSprueAdminWorkspaceCards: () => [
    { key: 'products', label: 'Products', href: '/admin/iron-sprue/products', status: 'empty', description: 'Product controls', requiredPermission: 'products:view' },
    { key: 'orders', label: 'Orders', href: '/admin/iron-sprue/orders', status: 'deferred', description: 'Order controls', requiredPermission: 'orders:view' },
  ],
}));

import IronSprueAdminSectionPage from './page';

describe('Iron Sprue Admin section page', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
  });

  it('renders empty-state product controls without importing catalogue data', async () => {
    const markup = renderToStaticMarkup(await IronSprueAdminSectionPage({ params: Promise.resolve({ section: 'products' }) }));

    expect(markup).toContain('No Iron Sprue products yet');
    expect(markup).toContain('The real catalogue import has not started');
    expect(markup).toContain('IRON_SPRUE');
    expect(markup).toContain('No real catalogue data');
  });

  it('rejects unknown Iron Sprue Admin sections', async () => {
    await expect(IronSprueAdminSectionPage({ params: Promise.resolve({ section: 'tcg-products' }) })).rejects.toThrow('not-found');
    expect(mocks.notFound).toHaveBeenCalled();
  });
});
