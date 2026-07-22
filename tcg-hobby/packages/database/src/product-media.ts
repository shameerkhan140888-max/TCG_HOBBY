import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './client';

export type ManagedProductImageInput = {
  productId: string;
  url: string;
  thumbnailUrl: string;
  storageKey: string;
  altText: string;
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
  uploadedById: string;
};

type ProductImageDb = PrismaClient | Prisma.TransactionClient;

async function assertProduct(productId: string, db: ProductImageDb) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new Error('Product not found.');
}

export async function listAdminProductImages(productId: string, db = prisma) {
  return db.productImage.findMany({
    where: { productId, deletionState: 'ACTIVE' },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export async function createManagedProductImage(input: ManagedProductImageInput, db = prisma) {
  return db.$transaction(async (tx) => {
    await assertProduct(input.productId, tx);
    const [count, last] = await Promise.all([
      tx.productImage.count({ where: { productId: input.productId, deletionState: 'ACTIVE' } }),
      tx.productImage.findFirst({ where: { productId: input.productId, deletionState: 'ACTIVE' }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } }),
    ]);
    const isPrimary = count === 0;
    if (isPrimary) await tx.productImage.updateMany({ where: { productId: input.productId }, data: { isPrimary: false } });
    return tx.productImage.create({
      data: {
        ...input,
        storageProvider: 'R2',
        imageType: isPrimary ? 'primary' : 'gallery',
        sortOrder: (last?.sortOrder ?? -1) + 1,
        isPrimary,
      },
    });
  });
}

export async function reorderProductImages(productId: string, imageIds: string[], db = prisma) {
  if (!imageIds.length || new Set(imageIds).size !== imageIds.length) throw new Error('Image order must contain unique image identifiers.');
  return db.$transaction(async (tx) => {
    const images = await tx.productImage.findMany({ where: { productId, deletionState: 'ACTIVE' }, select: { id: true } });
    if (images.length !== imageIds.length || images.some((image) => !imageIds.includes(image.id))) throw new Error('Image order must include every active product image exactly once.');
    await Promise.all(imageIds.map((id, sortOrder) => tx.productImage.update({ where: { id }, data: { sortOrder } })));
  });
}

export async function setPrimaryProductImage(productId: string, imageId: string, db = prisma) {
  return db.$transaction(async (tx) => {
    const image = await tx.productImage.findFirst({ where: { id: imageId, productId, deletionState: 'ACTIVE' } });
    if (!image) throw new Error('Product image not found.');
    await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false, imageType: 'gallery' } });
    return tx.productImage.update({ where: { id: imageId }, data: { isPrimary: true, imageType: 'primary' } });
  });
}

export async function updateProductImageAltText(productId: string, imageId: string, altText: string, db = prisma) {
  const value = altText.trim();
  if (value.length < 5 || value.length > 240) throw new Error('Alt text must be between 5 and 240 characters.');
  const result = await db.productImage.updateMany({ where: { id: imageId, productId, deletionState: 'ACTIVE' }, data: { altText: value } });
  if (!result.count) throw new Error('Product image not found.');
}

export async function markProductImageForDeletion(productId: string, imageId: string, db = prisma) {
  return db.$transaction(async (tx) => {
    const image = await tx.productImage.findFirst({ where: { id: imageId, productId, deletionState: 'ACTIVE' } });
    if (!image) throw new Error('Product image not found.');
    await tx.productImage.update({ where: { id: image.id }, data: { deletionState: 'PENDING_DELETE', deletedAt: new Date(), isPrimary: false } });
    if (image.isPrimary) {
      const replacement = await tx.productImage.findFirst({ where: { productId, deletionState: 'ACTIVE' }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] });
      if (replacement) await tx.productImage.update({ where: { id: replacement.id }, data: { isPrimary: true, imageType: 'primary' } });
    }
    return image;
  });
}

export async function completeProductImageDeletion(imageId: string, db = prisma) {
  await db.productImage.deleteMany({ where: { id: imageId, deletionState: 'PENDING_DELETE' } });
}

export async function recordProductImageCleanupFailure(productId: string, imageId: string, objectKey: string, message: string, db = prisma) {
  await db.productImageCleanup.create({ data: { productId, imageId, objectKey, attempts: 1, lastError: message.slice(0, 500) } });
}
