import { describe, expect, it, vi } from 'vitest';
import {
  isProductImageReferencedByOrder,
  reorderProductImages,
  setPrimaryProductImage,
  updateProductImageAltText,
} from './product-media.js';

describe('managed product image operations', () => {
  it('requires every active image exactly once when reordering', async () => {
    const tx = { productImage: { findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]), update: vi.fn() } }; const db = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    await expect(reorderProductImages('product', ['a'], db as never)).rejects.toThrow('every active product image');
    await expect(reorderProductImages('product', ['a', 'a'], db as never)).rejects.toThrow('unique image identifiers');
  });
  it('updates image order transactionally', async () => {
    const tx = { productImage: { findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]), update: vi.fn() } }; const db = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    await reorderProductImages('product', ['b', 'a'], db as never);
    expect(tx.productImage.update).toHaveBeenNthCalledWith(1, { where: { id: 'b' }, data: { sortOrder: 0 } });
  });
  it('scopes primary selection and alt updates to the product', async () => {
    const tx = { productImage: { findFirst: vi.fn().mockResolvedValue({ id: 'image' }), updateMany: vi.fn(), update: vi.fn() } }; const db = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    await setPrimaryProductImage('product', 'image', db as never);
    expect(tx.productImage.findFirst).toHaveBeenCalledWith({ where: { id: 'image', productId: 'product', deletionState: 'ACTIVE' } });
    const direct = { productImage: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    await updateProductImageAltText('product', 'image', 'Front product packaging', direct as never);
    expect(direct.productImage.updateMany).toHaveBeenCalledWith({ where: { id: 'image', productId: 'product', deletionState: 'ACTIVE' }, data: { altText: 'Front product packaging' } });
  });
  it('detects durable order references before managed media is physically removed', async () => {
    const db = {
      productImage: {
        findUnique: vi.fn().mockResolvedValue({
          url: 'https://media.example.test/product.webp',
          thumbnailUrl: 'https://media.example.test/product-card.webp',
          storageKey: 'products/product.webp',
        }),
      },
      orderItem: { count: vi.fn().mockResolvedValue(1) },
    };
    await expect(isProductImageReferencedByOrder('image', db as never)).resolves.toBe(true);
    expect(db.orderItem.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { imageStorageKey: 'products/product.webp' },
          { imageUrl: { in: ['https://media.example.test/product.webp', 'https://media.example.test/product-card.webp'] } },
        ],
      },
    });
  });
});
