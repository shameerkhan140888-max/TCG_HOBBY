import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

import IronSprueAdminSectionPage from './page';

describe('legacy nested Iron Sprue Admin section page', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React);
  });

  it('redirects section requests to the independent Iron Sprue Admin entry', async () => {
    await expect(IronSprueAdminSectionPage({ params: Promise.resolve({ section: 'products' }) })).rejects.toThrow('redirect:/iron-sprue-admin/products');
    expect(mocks.redirect).toHaveBeenCalledWith('/iron-sprue-admin/products');
  });
});
