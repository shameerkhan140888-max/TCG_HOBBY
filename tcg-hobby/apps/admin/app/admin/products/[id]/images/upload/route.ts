import { NextResponse } from 'next/server';
import { createManagedProductImage } from '@tcg-hobby/database';
import { requireAdminSession } from '../../../../../../lib/auth.server';
import { deleteProductImageObjects, processProductImage, uploadProcessedProductImage } from '../../../../../../lib/product-storage.server';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession(); const { id: productId } = await params;
  try {
    const formData = await request.formData(); const file = formData.get('image'); const altText = String(formData.get('altText') ?? '').trim();
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
    if (altText.length < 5 || altText.length > 240) return NextResponse.json({ error: 'Alt text must be between 5 and 240 characters.' }, { status: 400 });
    const processed = await processProductImage(productId, file); await uploadProcessedProductImage(processed);
    try { const image = await createManagedProductImage({ productId, url: processed.url, thumbnailUrl: processed.thumbnailUrl, storageKey: processed.storageKey, altText, width: processed.width, height: processed.height, mimeType: processed.mimeType, byteSize: processed.byteSize, uploadedById: session.user.id }); return NextResponse.json({ image }, { status: 201 }); }
    catch (error) { await deleteProductImageObjects([processed.storageKey, processed.thumbnailKey]).catch(() => undefined); throw error; }
  } catch (error) { console.error('product_image_upload_failed', { productId, message: error instanceof Error ? error.message : 'Unknown upload error' }); return NextResponse.json({ error: error instanceof Error ? error.message : 'Image upload failed.' }, { status: 400 }); }
}
