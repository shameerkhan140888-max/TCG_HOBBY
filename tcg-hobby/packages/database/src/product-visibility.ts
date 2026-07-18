import type { Prisma } from '@prisma/client';

type ProductVisibilityInput = {
  published: boolean;
  lifecycleState: string;
  archivedAt: Date | null;
  releaseStatus: string;
};

type ProductListingVisibilityInput = ProductVisibilityInput & {
  hideWhenOutOfStock?: boolean;
  inventory: {
    stockOnHand: number;
    reservedStock: number;
  } | null;
};

export function calculateAvailableStockForVisibility(inventory: ProductListingVisibilityInput['inventory']): number {
  return Math.max((inventory?.stockOnHand ?? 0) - (inventory?.reservedStock ?? 0), 0);
}

export function isProductPubliclyRouteable(product: ProductVisibilityInput): boolean {
  return product.published && product.lifecycleState === 'PUBLISHED' && !product.archivedAt && product.releaseStatus !== 'ARCHIVED';
}

export function isProductVisibleInStorefrontListings(product: ProductListingVisibilityInput): boolean {
  if (!isProductPubliclyRouteable(product)) {
    return false;
  }

  return calculateAvailableStockForVisibility(product.inventory) > 0 || product.hideWhenOutOfStock !== true;
}

export function getStorefrontPublicProductWhere(extra?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  const base: Prisma.ProductWhereInput = {
    published: true,
    lifecycleState: 'PUBLISHED',
    archivedAt: null,
    releaseStatus: { not: 'ARCHIVED' },
  };

  return extra ? { AND: [base, extra] } : base;
}

export function getStorefrontListingProductWhere(extra?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  const listingVisibility: Prisma.ProductWhereInput = {
    OR: [
      { hideWhenOutOfStock: false },
      {
        inventory: {
          is: {
            stockOnHand: { gt: 0 },
          },
        },
      },
    ],
  };

  return getStorefrontPublicProductWhere(extra ? { AND: [listingVisibility, extra] } : listingVisibility);
}
