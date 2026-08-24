'use server';

import { redirect } from 'next/navigation';
import { requireIronSprueCustomerSession } from './auth';
import { importLocalStorefrontDatabase } from './local-database';

export async function addIronSprueWishlistItemAction(formData: FormData) {
  const sku = String(formData.get('sku') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const session = await requireIronSprueCustomerSession(slug ? `/products/${slug}` : '/wishlist');
  const { prisma } = await importLocalStorefrontDatabase();
  const product = await prisma.ironSprueAdminProduct.findFirst({
    where: { storeCode: 'IRON_SPRUE', sku },
    select: { id: true },
  });
  if (product) {
    await prisma.ironSprueWishlistItem.upsert({
      where: { storeCode_userId_productId: { storeCode: 'IRON_SPRUE', userId: session.user.id, productId: product.id } },
      update: {},
      create: { storeCode: 'IRON_SPRUE', userId: session.user.id, productId: product.id },
    });
  }
  redirect('/wishlist?saved=1');
}

export async function removeIronSprueWishlistItemAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const session = await requireIronSprueCustomerSession('/wishlist');
  if (id) {
    const { prisma } = await importLocalStorefrontDatabase();
    await prisma.ironSprueWishlistItem.deleteMany({ where: { id, storeCode: 'IRON_SPRUE', userId: session.user.id } });
  }
  redirect('/wishlist?removed=1');
}
