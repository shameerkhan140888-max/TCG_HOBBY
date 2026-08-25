import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  r2Get: vi.fn(),
  cloudflareContext: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: mocks.cloudflareContext,
}));

import { GET } from './route';

describe('Iron Sprue public media route', () => {
  beforeEach(() => {
    mocks.r2Get.mockReset();
    mocks.cloudflareContext.mockReset();
    mocks.fetch.mockReset();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'access';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'secret';
  });

  it('streams allowed Iron Sprue media keys from the Cloudflare R2 binding', async () => {
    mocks.cloudflareContext.mockResolvedValue({
      env: {
        IRON_SPRUE_PRODUCT_MEDIA: {
          get: mocks.r2Get.mockResolvedValue({
            body: new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode('bound-image-bytes'));
                controller.close();
              },
            }),
            size: 17,
            httpMetadata: { contentType: 'image/png' },
          }),
        },
      },
    });

    const response = await GET(
      new NextRequest('http://localhost:3004/media/iron-sprue/products/is-aos-05628/image-2/master.png'),
      { params: Promise.resolve({ key: ['products', 'is-aos-05628', 'image-2', 'master.png'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(mocks.r2Get).toHaveBeenCalledWith('products/is-aos-05628/image-2/master.png');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('streams allowed Iron Sprue media keys from R2 with a signed Worker-native fetch', async () => {
    mocks.cloudflareContext.mockRejectedValue(new Error('No Cloudflare context'));
    mocks.fetch.mockResolvedValue(new Response(
      new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('image-bytes'));
            controller.close();
          },
        }),
      { headers: { 'Content-Type': 'image/png', 'Content-Length': '11' } },
    ));

    const response = await GET(
      new NextRequest('http://localhost:3004/media/iron-sprue/products/is-aos-05628/image-2/master.png'),
      { params: Promise.resolve({ key: ['products', 'is-aos-05628', 'image-2', 'master.png'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(String(mocks.fetch.mock.calls[0]?.[0])).toBe(
      'https://example.r2.cloudflarestorage.com/iron-sprue-product-media/products/is-aos-05628/image-2/master.png',
    );
    expect(mocks.fetch.mock.calls[0]?.[1]?.headers.Authorization).toContain('AWS4-HMAC-SHA256');
  });

  it('rejects unsafe object keys before contacting R2', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3004/media/iron-sprue/products/../secret.png'),
      { params: Promise.resolve({ key: ['products', '..', 'secret.png'] }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
