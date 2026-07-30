import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import sharp from 'sharp';
import { MAX_PRODUCT_IMAGE_BYTES, processHeroImage, processProductImage } from './product-storage.server';
beforeEach(() => { process.env.R2_ENDPOINT = 'https://example.invalid'; process.env.R2_ACCESS_KEY_ID = 'test'; process.env.R2_SECRET_ACCESS_KEY = 'test'; process.env.R2_BUCKET_NAME = 'test'; process.env.R2_PUBLIC_BASE_URL = 'https://media.example.invalid'; });
describe('managed product image processing', () => {
  it('rejects unsupported file signatures and oversize uploads', async () => {
    await expect(processProductImage('product', new File([new Uint8Array([1,2,3])], 'fake.jpg', { type: 'image/jpeg' }))).rejects.toThrow('file contents');
    await expect(processHeroImage('hero', new File([new Uint8Array([1,2,3])], 'fake.png', { type: 'image/png' }))).rejects.toThrow('file contents');
    const oversized = { size: MAX_PRODUCT_IMAGE_BYTES + 1 } as File; await expect(processProductImage('product', oversized)).rejects.toThrow('no larger than 10 MB');
  });
  it('preserves aspect ratio and creates uncropped WebP variants', async () => {
    const source = await sharp({ create: { width: 1200, height: 600, channels: 3, background: '#ffffff' } }).png().toBuffer(); const output = await processProductImage('product', new File([source], 'product.png', { type: 'image/png' }));
    expect(output.width / output.height).toBe(2); expect(output.mimeType).toBe('image/webp'); expect(output.storageKey).toMatch(/^products\/product\/.+\/main\.webp$/); const thumb = await sharp(output.thumbnail).metadata(); expect(thumb.width).toBe(800); expect(thumb.height).toBe(400);
  });
  it('creates an uncropped placement-owned hero variant without using a product-media key', async () => {
    const source = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#111111' } }).png().toBuffer();
    const output = await processHeroImage('hero-1', new File([source], 'hero.png', { type: 'image/png' }));
    expect(output.width / output.height).toBe(2);
    expect(output.storageKey).toMatch(/^heroes\/hero-1\/.+\/main\.webp$/);
    expect(output.storageKey).not.toContain('products/');
  });
});
