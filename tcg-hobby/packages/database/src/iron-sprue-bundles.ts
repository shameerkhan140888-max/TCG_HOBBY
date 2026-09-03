export type IronSprueBundleComponentDefinition = {
  sku: string;
  quantity: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeBundleComponent(value: unknown): IronSprueBundleComponentDefinition | null {
  const record = asRecord(value);
  const sku = typeof record?.sku === 'string' ? record.sku.trim() : '';
  const quantity = Number(record?.quantity ?? 1);
  if (!sku || !Number.isInteger(quantity) || quantity < 1) return null;
  return { sku, quantity };
}

export function ironSprueBundleComponentsFromSpecifications(specifications: unknown): IronSprueBundleComponentDefinition[] {
  const record = asRecord(specifications);
  const rawComponents = record?.bundleComponents ?? record?.components;
  if (!Array.isArray(rawComponents)) return [];
  return rawComponents
    .map(normalizeBundleComponent)
    .filter((component): component is IronSprueBundleComponentDefinition => component !== null);
}

export function isIronSprueBundleSpecifications(specifications: unknown) {
  return ironSprueBundleComponentsFromSpecifications(specifications).length > 0;
}
