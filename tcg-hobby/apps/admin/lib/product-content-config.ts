import type { GeneratedContentField, GeneratedProductContent, ProductFactInput, ProductFactKey } from '@tcg-hobby/database';

export const productFactKeysForAdmin = [
  'manufacturer',
  'manufacturerSku',
  'boosterPackCount',
  'cardsPerPack',
  'boxContents',
  'recommendedAge',
  'countryRegion',
  'edition',
  'franchise',
  'officialSource',
  'variationNotice',
] satisfies ProductFactKey[];

export const productFactDisplay: Record<ProductFactKey, { label: string; help?: string }> = {
  manufacturer: { label: 'Manufacturer' },
  manufacturerSku: { label: 'Manufacturer SKU' },
  boosterPackCount: { label: 'Booster pack count' },
  cardsPerPack: { label: 'Cards per pack' },
  boxContents: { label: 'Box contents', help: 'List only contents verified from packaging or an approved source.' },
  recommendedAge: { label: 'Recommended age' },
  countryRegion: { label: 'Country / region' },
  edition: { label: 'Edition' },
  franchise: { label: 'Franchise' },
  officialSource: { label: 'Official source' },
  variationNotice: { label: 'Variation notice' },
};

export const generationFields: Array<{ key: GeneratedContentField; label: string }> = [
  { key: 'shortDescription', label: 'Short description' }, { key: 'fullDescription', label: 'Full description' },
  { key: 'contents', label: 'Contents' }, { key: 'highlights', label: 'Highlights' },
  { key: 'specificationSummary', label: 'Specification summary' }, { key: 'seoTitle', label: 'SEO title' },
  { key: 'metaDescription', label: 'Meta description' }, { key: 'searchTags', label: 'Search tags' },
  { key: 'suggestedSlug', label: 'Suggested slug' }, { key: 'imageAltText', label: 'Primary image alt text' },
];

export const assistedContentControlClass = 'mt-1 w-full rounded border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:bg-neutral-900 disabled:text-neutral-500';

function comparableFact(fact: ProductFactInput | undefined) {
  return {
    value: fact?.value ?? '',
    verificationState: fact?.verificationState ?? 'UNVERIFIED',
    sourceReference: fact?.sourceReference ?? '',
  };
}

export function productFactsAreDirty(current: Record<string, ProductFactInput>, saved: ProductFactInput[]) {
  return productFactKeysForAdmin.some((key) => JSON.stringify(comparableFact(current[key])) !== JSON.stringify(comparableFact(saved.find((fact) => fact.key === key))));
}

export function hasSavedVerifiedFact(facts: ProductFactInput[]) {
  return facts.some((fact) => fact.verificationState === 'VERIFIED' && fact.value.trim().length > 0 && Boolean(fact.sourceReference?.trim()));
}

export function formatGeneratedValue(value: GeneratedProductContent[GeneratedContentField] | undefined) {
  return Array.isArray(value) ? value.join('\n') : String(value ?? '');
}

export function selectLatestReviewGeneration<T extends { status: string }>(generations: T[]) {
  return generations.find((generation) => generation.status === 'DRAFT') ?? generations.find((generation) => generation.status === 'APPLIED');
}
