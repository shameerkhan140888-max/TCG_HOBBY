'use server';
import { revalidatePath } from 'next/cache';
import { completeProductImageDeletion, markProductImageForDeletion, recordProductImageCleanupFailure, reorderProductImages, setPrimaryProductImage, updateProductImageAltText } from '@tcg-hobby/database';
import { requireAdminSession } from './auth.server';
import { deleteProductImageObjects, thumbnailKeyFor } from './product-storage.server';

export type ProductMediaActionResult = { ok: boolean; message: string };
function refresh(productId: string) { revalidatePath(`/admin/products/${productId}`); revalidatePath('/catalogue'); revalidatePath('/'); }
export async function reorderProductImagesAction(productId: string, imageIds: string[]): Promise<ProductMediaActionResult> {
  await requireAdminSession(`/admin/products/${productId}`); try { await reorderProductImages(productId, imageIds); refresh(productId); return { ok: true, message: 'Image order saved.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Image order could not be saved.' }; }
}
export async function setPrimaryProductImageAction(productId: string, imageId: string): Promise<ProductMediaActionResult> {
  await requireAdminSession(`/admin/products/${productId}`); try { await setPrimaryProductImage(productId, imageId); refresh(productId); return { ok: true, message: 'Primary image updated.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Primary image could not be updated.' }; }
}
export async function updateProductImageAltTextAction(productId: string, imageId: string, altText: string): Promise<ProductMediaActionResult> {
  await requireAdminSession(`/admin/products/${productId}`); try { await updateProductImageAltText(productId, imageId, altText); refresh(productId); return { ok: true, message: 'Alt text saved.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Alt text could not be saved.' }; }
}
export async function deleteProductImageAction(productId: string, imageId: string): Promise<ProductMediaActionResult> {
  await requireAdminSession(`/admin/products/${productId}`);
  try {
    const image = await markProductImageForDeletion(productId, imageId);
    if (image.storageKey) {
      const keys = [image.storageKey, thumbnailKeyFor(image.storageKey)];
      try { await deleteProductImageObjects(keys); }
      catch (error) { await recordProductImageCleanupFailure(productId, image.id, image.storageKey, error instanceof Error ? error.message : 'Storage deletion failed'); return { ok: false, message: 'The image is hidden. Storage cleanup has been queued for retry.' }; }
    }
    await completeProductImageDeletion(image.id); refresh(productId); return { ok: true, message: 'Image deleted.' };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Image could not be deleted.' }; }
}
