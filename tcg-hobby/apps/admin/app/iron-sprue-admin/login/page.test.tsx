import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentAdminSession: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('../../../lib/auth.server', () => ({
  getCurrentAdminSession: mocks.getCurrentAdminSession,
}));

vi.mock('../../../components/admin-login-form', () => ({
  AdminLoginForm: ({ callbackUrl }: { callbackUrl: string }) => <form data-callback={callbackUrl}>Login form</form>,
}));

import IronSprueAdminLoginPage from './page';

describe('Iron Sprue Admin login page', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
    mocks.getCurrentAdminSession.mockResolvedValue(null);
  });

  it('renders an Iron Sprue branded login with an Iron Sprue callback', async () => {
    const markup = renderToStaticMarkup(await IronSprueAdminLoginPage({ searchParams: Promise.resolve({ callbackUrl: '/iron-sprue-admin/media' }) }));

    expect(markup).toContain('alt="Iron Sprue"');
    expect(markup).toContain('Iron Sprue Admin');
    expect(markup).toContain('data-callback="/iron-sprue-admin/media"');
    expect(markup).not.toContain('TCG Hobby');
  });

  it('redirects an already-authenticated admin back to Iron Sprue Admin', async () => {
    mocks.getCurrentAdminSession.mockResolvedValue({ user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN' } });

    await expect(IronSprueAdminLoginPage({ searchParams: Promise.resolve({ callbackUrl: '/iron-sprue-admin/products' }) })).rejects.toThrow('redirect:/iron-sprue-admin/products');
    expect(mocks.redirect).toHaveBeenCalledWith('/iron-sprue-admin/products');
  });
});
