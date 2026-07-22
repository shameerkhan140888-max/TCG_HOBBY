import type { ProductFactKey } from '@tcg-hobby/database';

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
