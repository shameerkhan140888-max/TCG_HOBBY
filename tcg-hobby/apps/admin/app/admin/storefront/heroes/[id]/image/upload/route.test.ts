import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAdminRole: vi.fn(),
  processHeroImage: vi.fn(),
  uploadProcessedProductImage: vi.fn(),
  deleteProductImageObjects: vi.fn(),
  setManagedHomepageHeroImage: vi.fn(),
  detachHomepageHeroImage: vi.fn(),
  recordCleanupFailure: vi.fn(),
}));

vi.mock('../../../../../../../lib/auth.server', () => ({
  requireAdminRole: mocks.requireAdminRole,
}));
vi.mock('../../../../../../../lib/product-storage.server', () => ({
  processHeroImage: mocks.processHeroImage,
  uploadProcessedProductImage: mocks.uploadProcessedProductImage,
  deleteProductImageObjects: mocks.deleteProductImageObjects,
  thumbnailKeyFor: (key: string) => key.replace('/main.webp', '/thumbnail.webp'),
}));
vi.mock('@tcg-hobby/database', () => ({
  setManagedHomepageHeroImage: mocks.setManagedHomepageHeroImage,
  detachHomepageHeroImage: mocks.detachHomepageHeroImage,
  recordHomepageHeroImageCleanupFailure: mocks.recordCleanupFailure,
}));

import { DELETE, POST } from './route';

const params = Promise.resolve({ id: 'hero-1' });
const processed = {
  storageKey: 'heroes/hero-1/new/main.webp',
  thumbnailKey: 'heroes/hero-1/new/thumbnail.webp',
  url: 'https://media.example/heroes/hero-1/new/main.webp',
  thumbnailUrl: 'https://media.example/heroes/hero-1/new/thumbnail.webp',
  main: Buffer.from('main'),
  thumbnail: Buffer.from('thumb'),
  width: 2400,
  height: 1200,
  mimeType: 'image/webp',
  byteSize: 4,
};

function uploadRequest() {
  const formData = new FormData();
  formData.set('image', new File([new Uint8Array([1])], 'hero.png', { type: 'image/png' }));
  formData.set('altText', 'Authorised promotional artwork');
  return new Request('http://admin.test/admin/storefront/heroes/hero-1/image/upload', {
    method: 'POST',
    body: formData,
  });
}

describe('hero image upload route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminRole.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    mocks.processHeroImage.mockResolvedValue(processed);
    mocks.uploadProcessedProductImage.mockResolvedValue(undefined);
    mocks.deleteProductImageObjects.mockResolvedValue(undefined);
    mocks.recordCleanupFailure.mockResolvedValue(undefined);
    mocks.setManagedHomepageHeroImage.mockResolvedValue({
      placement: {
        productId: 'product-1',
        imageUrl: processed.url,
        imageThumbnailUrl: processed.thumbnailUrl,
        imageAlt: 'Authorised promotional artwork',
        imageWidth: 2400,
        imageHeight: 1200,
      },
      previousStorageKey: null,
    });
    mocks.detachHomepageHeroImage.mockResolvedValue({
      productId: 'product-1',
      imageStorageKey: processed.storageKey,
    });
  });

  it('requires an ADMIN before reading or uploading the file', async () => {
    mocks.requireAdminRole.mockRejectedValue(new Error('Administrator permission required.'));
    await expect(POST(uploadRequest(), { params })).rejects.toThrow('Administrator permission required.');
    expect(mocks.processHeroImage).not.toHaveBeenCalled();
  });

  it('rejects an unauthorised STAFF mutation before storage processing', async () => {
    mocks.requireAdminRole.mockRejectedValue(new Error('Administrator permission required.'));
    await expect(POST(uploadRequest(), { params })).rejects.toThrow('Administrator permission required.');
    expect(mocks.uploadProcessedProductImage).not.toHaveBeenCalled();
    expect(mocks.setManagedHomepageHeroImage).not.toHaveBeenCalled();
  });

  it('uploads placement-owned media without creating or changing product images', async () => {
    const response = await POST(uploadRequest(), { params });
    expect(response.status).toBe(201);
    expect(mocks.processHeroImage).toHaveBeenCalledWith('hero-1', expect.any(File));
    expect(mocks.setManagedHomepageHeroImage).toHaveBeenCalledWith(expect.objectContaining({
      placementId: 'hero-1',
      storageKey: processed.storageKey,
      uploadedById: 'admin-1',
    }));
    expect(mocks.deleteProductImageObjects).not.toHaveBeenCalled();
  });

  it('removes uploaded R2 objects when database persistence fails', async () => {
    mocks.setManagedHomepageHeroImage.mockRejectedValue(new Error('Database unavailable'));
    const response = await POST(uploadRequest(), { params });
    expect(response.status).toBe(400);
    expect(mocks.deleteProductImageObjects).toHaveBeenCalledWith([
      processed.storageKey,
      processed.thumbnailKey,
    ]);
  });

  it('explicitly detaches custom media and deletes only its placement-owned objects', async () => {
    const response = await DELETE(new Request('http://admin.test'), { params });
    expect(response.status).toBe(200);
    expect(mocks.detachHomepageHeroImage).toHaveBeenCalledWith('hero-1');
    expect(mocks.deleteProductImageObjects).toHaveBeenCalledWith([
      processed.storageKey,
      processed.thumbnailKey,
    ]);
  });
});
