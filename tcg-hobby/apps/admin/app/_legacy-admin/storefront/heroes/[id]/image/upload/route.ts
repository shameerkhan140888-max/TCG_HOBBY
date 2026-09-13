import { NextResponse } from 'next/server';
import {
  detachHomepageHeroImage,
  recordHomepageHeroImageCleanupFailure,
  setManagedHomepageHeroImage,
} from '@capital-hobby/database';
import { requireAdminRole } from '../../../../../../../lib/auth.server';
import {
  deleteProductImageObjects,
  processHeroImage,
  thumbnailKeyFor,
  uploadProcessedProductImage,
} from '../../../../../../../lib/product-storage.server';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminRole('/admin/storefront');
  const { id: placementId } = await params;
  let uploadedKeys: string[] = [];

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const altText = String(formData.get('altText') ?? '').trim();
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
    }
    if (altText.length < 5 || altText.length > 240) {
      return NextResponse.json({ error: 'Alt text must be between 5 and 240 characters.' }, { status: 400 });
    }

    const processed = await processHeroImage(placementId, file);
    uploadedKeys = [processed.storageKey, processed.thumbnailKey];
    await uploadProcessedProductImage(processed);

    const result = await setManagedHomepageHeroImage({
      placementId,
      url: processed.url,
      thumbnailUrl: processed.thumbnailUrl,
      storageKey: processed.storageKey,
      altText,
      width: processed.width,
      height: processed.height,
      mimeType: processed.mimeType,
      byteSize: processed.byteSize,
      uploadedById: session.user.id,
    });
    uploadedKeys = [];

    if (result.previousStorageKey && result.previousStorageKey !== processed.storageKey) {
      const previousKeys = [
        result.previousStorageKey,
        thumbnailKeyFor(result.previousStorageKey),
      ];
      try {
        await deleteProductImageObjects(previousKeys);
      } catch (error) {
        await recordHomepageHeroImageCleanupFailure(
          result.placement.productId,
          result.previousStorageKey,
          error instanceof Error ? error.message : 'Storage deletion failed',
        );
      }
    }

    return NextResponse.json({
      image: {
        url: result.placement.imageUrl,
        thumbnailUrl: result.placement.imageThumbnailUrl,
        altText: result.placement.imageAlt,
        width: result.placement.imageWidth,
        height: result.placement.imageHeight,
      },
    }, { status: 201 });
  } catch (error) {
    if (uploadedKeys.length) {
      await deleteProductImageObjects(uploadedKeys).catch(() => undefined);
    }
    console.error('hero_image_upload_failed', {
      placementId,
      message: error instanceof Error ? error.message : 'Unknown upload error',
    });
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Hero image upload failed.',
    }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdminRole('/admin/storefront');
  const { id: placementId } = await params;

  try {
    const detached = await detachHomepageHeroImage(placementId);
    if (detached.imageStorageKey) {
      try {
        await deleteProductImageObjects([
          detached.imageStorageKey,
          thumbnailKeyFor(detached.imageStorageKey),
        ]);
      } catch (error) {
        await recordHomepageHeroImageCleanupFailure(
          detached.productId,
          detached.imageStorageKey,
          error instanceof Error ? error.message : 'Storage deletion failed',
        );
        return NextResponse.json({
          ok: true,
          warning: 'The hero now uses the product image. Storage cleanup has been queued for retry.',
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Custom hero image could not be removed.',
    }, { status: 400 });
  }
}
