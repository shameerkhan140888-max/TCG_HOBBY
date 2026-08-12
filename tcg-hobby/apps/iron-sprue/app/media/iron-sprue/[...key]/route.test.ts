import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
  S3Client: class {
    send = mocks.send;
  },
}));

import { GET } from './route';

describe('Iron Sprue public media route', () => {
  beforeEach(() => {
    mocks.send.mockReset();
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'access';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'secret';
  });

  it('streams allowed Iron Sprue media keys from R2', async () => {
    mocks.send.mockResolvedValue({
      Body: {
        transformToWebStream: () => new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('image-bytes'));
            controller.close();
          },
        }),
      },
      ContentLength: 11,
      ContentType: 'image/png',
    });

    const response = await GET(
      new NextRequest('http://localhost:3004/media/iron-sprue/products/is-aos-05628/image-2/master.png'),
      { params: Promise.resolve({ key: ['products', 'is-aos-05628', 'image-2', 'master.png'] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it('rejects unsafe object keys before contacting R2', async () => {
    const response = await GET(
      new NextRequest('http://localhost:3004/media/iron-sprue/products/../secret.png'),
      { params: Promise.resolve({ key: ['products', '..', 'secret.png'] }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
