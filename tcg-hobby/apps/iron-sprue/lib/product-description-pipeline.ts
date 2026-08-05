export type IronSprueDescriptionField =
  | 'title'
  | 'shortDescription'
  | 'fullDescription'
  | 'featureBullets'
  | 'whatsIncluded'
  | 'skillLevel'
  | 'scale'
  | 'dimensions'
  | 'recommendedTools'
  | 'recommendedPaints'
  | 'relatedAccessories'
  | 'specifications';

export type IronSprueDescriptionSource = {
  sourceType: 'manufacturer' | 'authorised-distributor' | 'purchase-order' | 'manual-admin';
  sourceName: string;
  url?: string;
  factualUseOnly: boolean;
};

export type IronSprueDescriptionPlan = {
  requiredFields: readonly IronSprueDescriptionField[];
  allowedSources: readonly IronSprueDescriptionSource[];
  rules: readonly string[];
};

export const IRON_SPRUE_DESCRIPTION_FIELDS: readonly IronSprueDescriptionField[] = [
  'title',
  'shortDescription',
  'fullDescription',
  'featureBullets',
  'whatsIncluded',
  'skillLevel',
  'scale',
  'dimensions',
  'recommendedTools',
  'recommendedPaints',
  'relatedAccessories',
  'specifications',
];

export const IRON_SPRUE_DESCRIPTION_RULES = [
  'Do not copy supplier descriptions wholesale.',
  'Use manufacturer and authorised distributor information as factual source material only.',
  'Do not invent specifications, contents, colours, dimensions, skill levels or scale.',
  'Write original Iron Sprue copy in a concise premium retail tone.',
  'Keep operational claims such as stock, dispatch and pricing outside long-form descriptions.',
] as const;

export function createIronSprueDescriptionPlan(sources: readonly IronSprueDescriptionSource[]): IronSprueDescriptionPlan {
  if (sources.length === 0) throw new Error('At least one factual source is required before generating Iron Sprue product copy.');
  if (sources.some((source) => source.sourceType === 'authorised-distributor' && !source.factualUseOnly)) {
    throw new Error('Authorised distributor descriptions may only be used as factual source material.');
  }

  return {
    requiredFields: IRON_SPRUE_DESCRIPTION_FIELDS,
    allowedSources: sources.map((source) => ({ ...source, factualUseOnly: true })),
    rules: IRON_SPRUE_DESCRIPTION_RULES,
  };
}
