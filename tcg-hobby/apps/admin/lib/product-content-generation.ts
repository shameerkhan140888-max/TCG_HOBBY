import type { GeneratedContentField, GeneratedProductContent } from '@tcg-hobby/database';
import type { ProductContentProvider } from './product-content-provider.server';

type ContentWorkspace = {
  name: string;
  slug: string;
  brand: string | null;
  game: string;
  setName: string | null;
  productType: string | null;
  language: string | null;
  facts: Array<{ key: string; value: string; verificationState: string; sourceReference: string | null }>;
};

type GenerationDependencies = {
  getWorkspace(productId: string): Promise<ContentWorkspace | null>;
  createProvider(): ProductContentProvider;
  createDraft(input: {
    productId: string;
    requestedById: string;
    provider: string;
    model: string;
    requestedFields: GeneratedContentField[];
    content: GeneratedProductContent;
    warnings: string[];
  }): Promise<unknown>;
};

export async function generateProductReviewDraft(
  productId: string,
  requestedById: string,
  requestedFields: GeneratedContentField[],
  dependencies: GenerationDependencies,
) {
  const workspace = await dependencies.getWorkspace(productId);
  if (!workspace) throw new Error('Product not found.');

  const verifiedFacts = workspace.facts
    .filter((fact) => fact.verificationState === 'VERIFIED' && fact.value.trim() && fact.sourceReference?.trim())
    .map((fact) => ({ key: fact.key, value: fact.value.trim(), sourceReference: fact.sourceReference?.trim() ?? null }));

  if (!verifiedFacts.length) {
    throw new Error('Complete and verify at least one product fact, save the facts, then generate a review draft.');
  }

  const generated = await dependencies.createProvider().generate({
    product: {
      name: workspace.name,
      slug: workspace.slug,
      brand: workspace.brand,
      game: workspace.game,
      setName: workspace.setName,
      productType: workspace.productType,
      language: workspace.language,
    },
    verifiedFacts,
    requestedFields,
  });

  await dependencies.createDraft({
    productId,
    requestedById,
    provider: 'openai',
    model: generated.model,
    requestedFields,
    content: generated.content,
    warnings: generated.content.missingFactWarnings,
  });

  return generated;
}
