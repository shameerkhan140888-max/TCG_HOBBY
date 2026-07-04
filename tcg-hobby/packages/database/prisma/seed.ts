import { prisma } from '../src/client';
import {
  seedAddresses,
  seedCategories,
  seedCartItems,
  seedCarts,
  seedInventory,
  seedOrderItems,
  seedOrders,
  seedProductImages,
  seedProducts,
  seedWishlists,
  seedWishlistItems,
  seedSupplierProducts,
  seedSuppliers,
  seedUsers,
} from '../src/seed-data';

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({ data: seedUsers });
  await prisma.address.createMany({ data: seedAddresses });
  await prisma.category.createMany({ data: seedCategories });
  await prisma.supplier.createMany({ data: seedSuppliers });
  await prisma.wishlist.createMany({ data: seedWishlists });

  await prisma.product.createMany({
    data: seedProducts.map((product) => {
      const category = seedCategories.find((item) => item.slug === product.categorySlug);

      if (!category) {
        throw new Error(`Missing category for ${product.slug}`);
      }

      return {
        id: product.id,
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        game: product.game,
        setName: product.setName,
        description: product.description,
        longDescription: product.longDescription,
        condition: product.condition,
        priceMinor: product.priceMinor,
        currency: product.currency,
        featured: product.featured,
        published: product.published,
        searchText: product.searchText,
        imageLabel: product.imageLabel,
        categoryId: category.id,
      };
    }),
  });

  await prisma.inventoryItem.createMany({
    data: seedInventory.map((inventory) => {
      const product = seedProducts.find((item) => item.slug === inventory.productSlug);

      if (!product) {
        throw new Error(`Missing product for inventory ${inventory.id}`);
      }

      return {
        id: inventory.id,
        productId: product.id,
        stockOnHand: inventory.stockOnHand,
        reservedStock: inventory.reservedStock,
        reorderPoint: inventory.reorderPoint,
        locationCode: inventory.locationCode,
      };
    }),
  });

  await prisma.productImage.createMany({
    data: seedProductImages.map((image) => {
      const product = seedProducts.find((entry) => entry.slug === image.productSlug);

      if (!product) {
        throw new Error(`Missing product for image ${image.id}`);
      }

      return {
        id: image.id,
        productId: product.id,
        url: image.url,
        altText: image.altText,
        imageType: image.imageType,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      };
    }),
  });

  await prisma.cart.createMany({
    data: seedCarts,
  });

  await prisma.cartItem.createMany({
    data: seedCartItems.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);

      if (!product) {
        throw new Error(`Missing product for cart item ${item.id}`);
      }

      return {
        id: item.id,
        cartId: item.cartId,
        productId: product.id,
        productName: item.productName,
        productSlug: item.productSlugSnapshot,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      };
    }),
  });

  await prisma.order.createMany({
    data: seedOrders.map((order) => ({
      ...order,
      shippingMethodAmountMinor: order.shippingMinor,
    })),
  });

  await prisma.orderItem.createMany({
    data: seedOrderItems.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);

      if (!product) {
        throw new Error(`Missing product for order item ${item.id}`);
      }

      return {
        id: item.id,
        orderId: item.orderId,
        productId: product.id,
        productName: item.productName,
        productSlug: item.productSlugSnapshot,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        totalMinor: item.totalMinor,
      };
    }),
  });

  await prisma.supplierProduct.createMany({
    data: seedSupplierProducts.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);
      const supplier = seedSuppliers.find((entry) => entry.slug === item.supplierSlug);

      if (!product || !supplier) {
        throw new Error(`Missing seed relation for supplier product ${item.id}`);
      }

      return {
        id: item.id,
        supplierId: supplier.id,
        productId: product.id,
        supplierSku: item.supplierSku,
        costMinor: item.costMinor,
        currency: item.currency,
        leadTimeDays: item.leadTimeDays,
      };
    }),
  });

  await prisma.wishlistItem.createMany({
    data: seedWishlistItems.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);
      const wishlist = seedWishlists.find((entry) => entry.id === item.wishlistId);

      if (!product || !wishlist) {
        throw new Error(`Missing seed relation for wishlist item ${item.id}`);
      }

      return {
        id: item.id,
        wishlistId: wishlist.id,
        productId: product.id,
      };
    }),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
