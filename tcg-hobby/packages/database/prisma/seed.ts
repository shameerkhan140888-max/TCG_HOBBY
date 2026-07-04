import { prisma } from '../src/client';
import {
  seedAddresses,
  seedCategories,
  seedBuylistItems,
  seedBuylists,
  seedCollectionItems,
  seedCollections,
  seedCartItems,
  seedCarts,
  seedDeckCards,
  seedDecks,
  seedNotificationSubscriptions,
  seedReleaseProducts,
  seedReleases,
  seedInventory,
  seedOrderItems,
  seedOrders,
  seedPricingRules,
  seedProductPricing,
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
  await prisma.notificationSubscription.deleteMany();
  await prisma.releaseProduct.deleteMany();
  await prisma.release.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.buylistItem.deleteMany();
  await prisma.buylist.deleteMany();
  await prisma.deckCard.deleteMany();
  await prisma.deck.deleteMany();
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productPricing.deleteMany();
  await prisma.pricingRule.deleteMany();
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
        releaseStatus: product.releaseStatus ?? 'RELEASED',
        releaseDate: product.releaseDate ? new Date(product.releaseDate) : null,
        expectedDispatchAt: product.expectedDispatchAt ? new Date(product.expectedDispatchAt) : null,
        expectedArrivalAt: product.expectedArrivalAt ? new Date(product.expectedArrivalAt) : null,
        allocationLimit: product.allocationLimit ?? null,
        customerPurchaseLimit: product.customerPurchaseLimit ?? null,
        supplierAllocation: product.supplierAllocation ?? null,
        lowAllocationThreshold: product.lowAllocationThreshold ?? null,
        availabilityMessage: product.availabilityMessage ?? null,
        preorderBadgeLabel: product.preorderBadgeLabel ?? null,
        comingSoonBadgeLabel: product.comingSoonBadgeLabel ?? null,
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

  await prisma.pricingRule.createMany({
    data: seedPricingRules.map((rule) => {
      const categoryId = rule.categorySlug
        ? seedCategories.find((item) => item.slug === rule.categorySlug)?.id ?? null
        : null;
      const productId = rule.productSlug
        ? seedProducts.find((item) => item.slug === rule.productSlug)?.id ?? null
        : null;
      const supplierId = rule.supplierSlug
        ? seedSuppliers.find((item) => item.slug === rule.supplierSlug)?.id ?? null
        : null;

      return {
        id: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        ruleScope: rule.ruleScope,
        productId,
        categoryId,
        supplierId,
        currency: rule.currency,
        priority: rule.priority,
        active: rule.active,
        config: rule.config,
      };
    }),
  });

  await prisma.productPricing.createMany({
    data: seedProductPricing.map((pricing) => {
      const product = seedProducts.find((entry) => entry.slug === pricing.productSlug);
      if (!product) {
        throw new Error(`Missing product for pricing ${pricing.id}`);
      }

      return {
        id: pricing.id,
        productId: product.id,
        pricingRuleId: pricing.pricingRuleId,
        costMinor: pricing.costMinor,
        retailMinor: pricing.retailMinor,
        buyMinor: pricing.buyMinor,
        marginMinor: pricing.marginMinor,
        markupPercent: pricing.markupPercent,
        profitMinor: pricing.profitMinor,
        minimumMarginPercent: pricing.minimumMarginPercent,
        maximumDiscountPercent: pricing.maximumDiscountPercent,
        priceSource: pricing.priceSource,
        priceStatus: pricing.priceStatus,
        manualOverride: pricing.manualOverride,
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

  await prisma.buylist.createMany({
    data: seedBuylists.map((buylist) => ({
      id: buylist.id,
      buylistNumber: buylist.buylistNumber,
      userId: buylist.userId,
      status: buylist.status,
      currency: buylist.currency,
      estimatedPayoutMinor: buylist.estimatedPayoutMinor,
      offeredPayoutMinor: buylist.offeredPayoutMinor,
      customerNotes: buylist.customerNotes,
      staffNotes: buylist.staffNotes,
      paymentReference: buylist.paymentReference,
      submittedAt: buylist.submittedAt ? new Date(buylist.submittedAt) : null,
      receivedAt: buylist.receivedAt ? new Date(buylist.receivedAt) : null,
      reviewedAt: buylist.reviewedAt ? new Date(buylist.reviewedAt) : null,
      approvedAt: buylist.approvedAt ? new Date(buylist.approvedAt) : null,
      rejectedAt: buylist.rejectedAt ? new Date(buylist.rejectedAt) : null,
      paidAt: buylist.paidAt ? new Date(buylist.paidAt) : null,
    })),
  });

  await prisma.buylistItem.createMany({
    data: seedBuylistItems.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);

      if (!product) {
        throw new Error(`Missing product for buylist item ${item.id}`);
      }

      return {
        id: item.id,
        buylistId: item.buylistId,
        productId: product.id,
        quantity: item.quantity,
        estimatedBuyMinor: item.estimatedBuyMinor,
        offeredBuyMinor: item.offeredBuyMinor,
        notes: item.notes,
      };
    }),
  });

  await prisma.collection.createMany({
    data: seedCollections,
  });

  await prisma.collectionItem.createMany({
    data: seedCollectionItems.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);

      if (!product) {
        throw new Error(`Missing product for collection item ${item.id}`);
      }

      return {
        id: item.id,
        collectionId: item.collectionId,
        productId: product.id,
        ownedQuantity: item.ownedQuantity,
        printVariant: item.printVariant,
        condition: item.condition,
        foil: item.foil,
        language: item.language,
        notes: item.notes,
        dateAcquired: item.dateAcquired ? new Date(item.dateAcquired) : null,
        purchasePriceMinor: item.purchasePriceMinor,
      };
    }),
  });

  await prisma.deck.createMany({
    data: seedDecks,
  });

  await prisma.deckCard.createMany({
    data: seedDeckCards.map((item) => {
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);

      if (!product) {
        throw new Error(`Missing product for deck card ${item.id}`);
      }

      return {
        id: item.id,
        deckId: item.deckId,
        productId: product.id,
        quantity: item.quantity,
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

  await prisma.release.createMany({
    data: seedReleases.map((release) => {
      const category = seedCategories.find((entry) => entry.slug === release.categorySlug);

      if (!category) {
        throw new Error(`Missing category for release ${release.slug}`);
      }

      return {
        id: release.id,
        name: release.name,
        slug: release.slug,
        brand: release.brand,
        game: release.game,
        categoryId: category.id,
        releaseDate: new Date(release.releaseDate),
        expectedDispatchAt: release.expectedDispatchAt ? new Date(release.expectedDispatchAt) : null,
        expectedArrivalAt: release.expectedArrivalAt ? new Date(release.expectedArrivalAt) : null,
        announcementText: release.announcementText,
        releaseNotes: release.releaseNotes,
        visible: release.visible,
        featuredOnHomepage: release.featuredOnHomepage,
      };
    }),
  });

  await prisma.releaseProduct.createMany({
    data: seedReleaseProducts.map((item) => {
      const release = seedReleases.find((entry) => entry.slug === item.releaseSlug);
      const product = seedProducts.find((entry) => entry.slug === item.productSlug);

      if (!release || !product) {
        throw new Error(`Missing seed relation for release product ${item.id}`);
      }

      return {
        id: item.id,
        releaseId: release.id,
        productId: product.id,
        status: item.releaseStatus,
        releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
        expectedDispatchAt: item.expectedDispatchAt ? new Date(item.expectedDispatchAt) : null,
        expectedArrivalAt: item.expectedArrivalAt ? new Date(item.expectedArrivalAt) : null,
        allocationLimit: item.allocationLimit,
        customerPurchaseLimit: item.customerPurchaseLimit,
        supplierAllocation: item.supplierAllocation,
        allocatedQuantity: item.allocatedQuantity,
        lowAllocationThreshold: item.lowAllocationThreshold,
        availabilityMessage: item.availabilityMessage,
        preorderBadgeLabel: item.preorderBadgeLabel,
        comingSoonBadgeLabel: item.comingSoonBadgeLabel,
      };
    }),
  });

  await prisma.notificationSubscription.createMany({
    data: seedNotificationSubscriptions.map((subscription) => {
      const product = seedProducts.find((entry) => entry.slug === subscription.productSlug);

      if (!product) {
        throw new Error(`Missing product for notification subscription ${subscription.id}`);
      }

      return {
        id: subscription.id,
        userId: subscription.userId,
        productId: product.id,
        preference: subscription.preference,
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
