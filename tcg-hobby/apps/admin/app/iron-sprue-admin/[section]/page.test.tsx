import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  section: vi.fn(({ section, searchParams }: { section: string; searchParams?: Record<string, unknown> }) => (
    <section>Iron section {section} {String(searchParams?.q ?? '')}</section>
  )),
}));

vi.mock('../../../lib/auth.server', () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock('../../../components/iron-sprue-admin-section', () => ({
  IronSprueAdminSection: mocks.section,
}));

vi.mock('../../../components/iron-sprue-admin-shell', () => ({
  IronSprueAdminShell: ({ children }: { children: React.ReactNode }) => <div data-shell="iron-sprue">{children}</div>,
}));

import IronSprueAdminSectionPage from './page';

describe('direct Iron Sprue Admin section page', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
    mocks.requireAdminSession.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@example.test', name: 'Admin User', role: 'ADMIN' },
      sessionToken: 'session',
      expires: new Date('2099-01-01T00:00:00.000Z'),
    });
  });

  it('keeps authenticated section access in the Iron Sprue shell', async () => {
    const markup = renderToStaticMarkup(await IronSprueAdminSectionPage({
      params: Promise.resolve({ section: 'media' }),
      searchParams: Promise.resolve({ q: 'toyota' }),
    }));

    expect(mocks.requireAdminSession).toHaveBeenCalledWith('/iron-sprue-admin/media', '/iron-sprue-admin/login');
    expect(markup).toContain('data-shell="iron-sprue"');
    expect(markup).toContain('Iron section media toyota');
  });
});
