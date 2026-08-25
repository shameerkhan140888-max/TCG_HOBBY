import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireIronSprueAdminSession: vi.fn(),
  dashboard: vi.fn(({ session }: { session: { user: { email: string } } }) => <section>Iron dashboard for {session.user.email}</section>),
}));

vi.mock('../../lib/auth.server', () => ({
  requireIronSprueAdminSession: mocks.requireIronSprueAdminSession,
}));

vi.mock('../../components/iron-sprue-admin-dashboard', () => ({
  IronSprueAdminDashboard: mocks.dashboard,
}));

vi.mock('../../components/iron-sprue-admin-shell', () => ({
  IronSprueAdminShell: ({ children }: { children: React.ReactNode }) => <div data-shell="iron-sprue">{children}</div>,
}));

import IronSprueAdminPage from './page';

describe('direct Iron Sprue Admin page', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
    mocks.requireIronSprueAdminSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', name: 'Admin User', role: 'ADMIN' },
      sessionToken: 'session',
      expires: new Date('2099-01-01T00:00:00.000Z'),
    });
  });

  it('uses the Iron Sprue login flow and renders the independent shell', async () => {
    const markup = renderToStaticMarkup(await IronSprueAdminPage());

    expect(mocks.requireIronSprueAdminSession).toHaveBeenCalledWith('/iron-sprue-admin', '/iron-sprue-admin/login');
    expect(markup).toContain('data-shell="iron-sprue"');
    expect(markup).toContain('Iron dashboard for admin@example.test');
  });
});
