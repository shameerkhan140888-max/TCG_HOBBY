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

vi.mock('server-only', () => ({}));

import { GET } from './route';
import { ironSprueAdminSignedPreviewUrl } from '../../../../lib/iron-sprue-media-preview-signing.server';

describe('Iron Sprue Admin media preview route', () => {
  beforeEach(() => {
    mocks.send.mockReset();
    process.env.AUTH_SECRET = 'test-auth-secret';
    process.env.IRON_SPRUE_R2_BUCKET_NAME = 'iron-sprue-product-media';
    process.env.IRON_SPRUE_R2_ENDPOINT = 'https://example.r2.cloudflarestorage.com';
    process.env.IRON_SPRUE_R2_ACCESS_KEY_ID = 'access';
    process.env.IRON_SPRUE_R2_SECRET_ACCESS_KEY = 'secret';
  });

  it('streams an authenticated Iron Sprue R2 object preview by storage key', async () => {
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

    const previewUrl = ironSprueAdminSignedPreviewUrl('products/is-aos-05628/image-2/master.png');
    const response = await GET(new NextRequest(`http://localhost:3001${previewUrl}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it('rejects unsigned media preview URLs before touching R2', async () => {
    const response = await GET(new NextRequest('http://localhost:3001/iron-sprue-admin/media/preview?key=products%2Fis-aos-05628%2Fimage-2%2Fmaster.png'));

    expect(response.status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('rejects unsafe media keys before touching R2', async () => {
    const response = await GET(new NextRequest('http://localhost:3001/iron-sprue-admin/media/preview?key=..%2Fsecret'));

    expect(response.status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('returns 404 instead of throwing for missing R2 objects', async () => {
    const error = new Error('The specified key does not exist.');
    error.name = 'NoSuchKey';
    mocks.send.mockRejectedValue(error);

    const previewUrl = ironSprueAdminSignedPreviewUrl('products/is-aos-05628/missing.png');
    const response = await GET(new NextRequest(`http://localhost:3001${previewUrl}`));

    expect(response.status).toBe(404);
  });
});
