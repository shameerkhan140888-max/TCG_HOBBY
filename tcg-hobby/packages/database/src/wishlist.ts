import type { CatalogueProduct } from '@tcg-hobby/types';
import { prisma } from './client';

type WishlistProductRow = {
  id: string;
  slug: string;
  name: string;
  game: string;
  description: string;
  featured: boolean;
  imageLabel: string;
  category: {
    name: string;
    slug: string;
  };
  inventory: {
    stockOnHand: number;
    reservedStock: number;
  } | null;
  supplierProducts: Array<{
    supplier: {
      name: string;
    };
  }>;
  priceMinor: number;
  currency: string;
};

type WishlistItemRow = {
  id: string;
  createdAt: Date;
  product: WishlistProductRow;
};

export type WishlistItem = {
  id: string;
  productId: string;
  addedAt: Date;
  product: CatalogueProduct;
};

function mapWishlistProductRow(product: WishlistProductRow): CatalogueProduct {
  const inventory = product.inventory;
  const supplier = product.supplierProducts[0]?.supplier;

  if (!inventory || !supplier) {
    throw new Error(`Incomplete wishlist product row for ${product.slug}`);
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    game: product.game,
    description: product.description,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    price: {
      amountMinor: product.priceMinor,
      currency: product.currency as CatalogueProduct['price']['currency'],
    },
    featured: product.featured,
    inStock: inventory.stockOnHand - inventory.reservedStock > 0,
    stockOnHand: inventory.stockOnHand,
    reservedStock: inventory.reservedStock,
    supplierName: supplier.name,
    badge: product.featured ? 'Featured' : product.category.name,
    imageLabel: product.imageLabel,
  };
}

async function ensureWishlistExists(userId: string, db = prisma) {
  const wishlist = await db.wishlist.findUnique({ where: { userId } });

  if (wishlist) {
    return wishlist;
  }

  return db.wishlist.create({ data: { userId } });
}

export async function getWishlistProductIds(userId: string, db = prisma) {
  const wishlist = await db.wishlist.findUnique({
    where: { userId },
    select: {
      items: {
        select: {
          productId: true,
        },
      },
    },
  });

  return wishlist?.items.map((item: { productId: string }) => item.productId) ?? [];
}

export async function getWishlistItems(userId: string, db = prisma): Promise<WishlistItem[]> {
  const wishlist = await db.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              category: true,
              inventory: true,
              supplierProducts: {
                include: {
                  supplier: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!wishlist) {
    return [];
  }

  return wishlist.items.map((item: WishlistItemRow) => ({
    id: item.id,
    productId: item.product.id,
    addedAt: item.createdAt,
    product: mapWishlistProductRow(item.product),
  }));
}

export async function isProductWishlisted(userId: string, productId: string, db = prisma) {
  const wishlist = await db.wishlist.findUnique({
    where: { userId },
    select: {
      items: {
        where: { productId },
        select: { id: true },
      },
    },
  });

  return (wishlist?.items.length ?? 0) > 0;
}

export async function addProductToWishlist(userId: string, productId: string, db = prisma) {
  const wishlist = await ensureWishlistExists(userId, db);

  await db.wishlistItem.upsert({
    where: {
      wishlistId_productId: {
        wishlistId: wishlist.id,
        productId,
      },
    },
    create: {
      wishlistId: wishlist.id,
      productId,
    },
    update: {
      productId,
    },
  });

  return true;
}

export async function removeProductFromWishlist(userId: string, productId: string, db = prisma) {
  const wishlist = await db.wishlist.findUnique({ where: { userId }, select: { id: true } });

  if (!wishlist) {
    return false;
  }

  await db.wishlistItem.deleteMany({
    where: {
      wishlistId: wishlist.id,
      productId,
    },
  });

  return true;
}

export async function toggleWishlistItem(userId: string, productId: string, db = prisma) {
  const wishlisted = await isProductWishlisted(userId, productId, db);

  if (wishlisted) {
    await removeProductFromWishlist(userId, productId, db);
    return { wishlisted: false };
  }

  await addProductToWishlist(userId, productId, db);
  return { wishlisted: true };
}
