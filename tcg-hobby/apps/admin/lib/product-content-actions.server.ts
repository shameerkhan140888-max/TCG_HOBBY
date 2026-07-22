'use server';
import { revalidatePath } from 'next/cache';
import { applyContentGeneration, countRecentContentGenerations, createContentGenerationDraft, discardContentGeneration, GENERATED_CONTENT_FIELDS, getProductContentWorkspace, replaceProductFacts, restoreContentGeneration, setProductReviewLifecycle, type GeneratedContentField, type ProductFactInput } from '@tcg-hobby/database';
import { requireAdminSession } from './auth.server';
import { createOpenAiContentProvider } from './product-content-provider.server';
import { generateProductReviewDraft } from './product-content-generation';
export type ProductContentActionResult = { ok: boolean; message: string };
function refresh(productId: string) { revalidatePath(`/admin/products/${productId}`); revalidatePath('/catalogue'); revalidatePath('/'); }
export async function saveProductFactsAction(productId: string, facts: ProductFactInput[]): Promise<ProductContentActionResult> { const session = await requireAdminSession(`/admin/products/${productId}`); try { await replaceProductFacts(productId, facts, session.user.id); refresh(productId); return { ok: true, message: 'Structured facts saved.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Facts could not be saved.' }; } }
export async function generateProductContentAction(productId: string, requestedFields: GeneratedContentField[]): Promise<ProductContentActionResult> {
  const session = await requireAdminSession(`/admin/products/${productId}`);
  try {
    const validFields = requestedFields.filter((field) => GENERATED_CONTENT_FIELDS.includes(field)); if (!validFields.length) throw new Error('Choose at least one field to generate.');
    const recent = await countRecentContentGenerations(session.user.id, new Date(Date.now() - 10 * 60_000)); if (recent >= 5) throw new Error('Generation limit reached. Try again in a few minutes.');
    await generateProductReviewDraft(productId, session.user.id, validFields, {
      getWorkspace: getProductContentWorkspace,
      createProvider: createOpenAiContentProvider,
      createDraft: createContentGenerationDraft,
    });
    refresh(productId); return { ok: true, message: 'Draft content generated for review. Nothing has been published.' };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Content generation failed.' }; }
}
export async function applyProductContentAction(productId: string, generationId: string, fields: GeneratedContentField[]): Promise<ProductContentActionResult> { const session = await requireAdminSession(`/admin/products/${productId}`); try { await applyContentGeneration(generationId, fields, session.user.id); refresh(productId); return { ok: true, message: 'Selected fields applied. Publication was not changed.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Generated content could not be applied.' }; } }
export async function discardProductContentAction(productId: string, generationId: string): Promise<ProductContentActionResult> { const session = await requireAdminSession(`/admin/products/${productId}`); try { await discardContentGeneration(generationId, session.user.id); refresh(productId); return { ok: true, message: 'Draft discarded.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Draft could not be discarded.' }; } }
export async function restoreProductContentAction(productId: string, generationId: string): Promise<ProductContentActionResult> { const session = await requireAdminSession(`/admin/products/${productId}`); try { await restoreContentGeneration(generationId, session.user.id); refresh(productId); return { ok: true, message: 'Previous content restored.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Previous content could not be restored.' }; } }
export async function setProductReviewLifecycleAction(productId: string, state: 'DRAFT' | 'AWAITING_REVIEW'): Promise<ProductContentActionResult> { await requireAdminSession(`/admin/products/${productId}`); try { await setProductReviewLifecycle(productId, state); refresh(productId); return { ok: true, message: state === 'DRAFT' ? 'Product saved as draft.' : 'Product is ready for review.' }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'Lifecycle could not be updated.' }; } }
