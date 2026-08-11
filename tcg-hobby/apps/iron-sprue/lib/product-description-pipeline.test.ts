import { describe, expect, it } from 'vitest';
import {
  createIronSprueDescriptionPlan,
  generateIronSprueProductDescription,
  IRON_SPRUE_DESCRIPTION_FIELDS,
  IRON_SPRUE_DESCRIPTION_RULES,
  isPlaceholderDescription,
} from './product-description-pipeline';

describe('Iron Sprue product description pipeline', () => {
  it('requires factual source material before copy generation', () => {
    expect(() => createIronSprueDescriptionPlan([])).toThrow(/factual source/);
  });

  it('plans all required commerce copy fields from factual sources only', () => {
    const plan = createIronSprueDescriptionPlan([
      {
        sourceType: 'manufacturer',
        sourceName: 'Aoshima',
        url: 'https://manufacturer.example/product',
        factualUseOnly: true,
      },
      {
        sourceType: 'authorised-distributor',
        sourceName: 'Tasma Products',
        url: 'https://authorised-distributor.example/product',
        factualUseOnly: true,
      },
    ]);

    expect(plan.requiredFields).toEqual(IRON_SPRUE_DESCRIPTION_FIELDS);
    expect(plan.allowedSources.every((source) => source.factualUseOnly)).toBe(true);
    expect(plan.rules).toContain('Do not invent specifications, contents, colours, dimensions, skill levels or scale.');
  });

  it('rejects supplier copy as direct marketing copy', () => {
    expect(() =>
      createIronSprueDescriptionPlan([
        {
          sourceType: 'authorised-distributor',
          sourceName: 'Tasma Products',
          factualUseOnly: false,
        },
      ]),
    ).toThrow(/factual source material/);

    expect(IRON_SPRUE_DESCRIPTION_RULES).toContain('Do not copy supplier descriptions wholesale.');
  });

  it('detects previous launch placeholder copy', () => {
    expect(
      isPlaceholderDescription({
        shortDescription: 'Aoshima Toyota 2000GT Red selected for the Iron Sprue launch range.',
        description: 'Final box-specific details should be checked against the supplied product before publication.',
      }),
    ).toBe(true);
  });

  it('generates specific Aoshima copy without inventing unverified kit facts', () => {
    const copy = generateIronSprueProductDescription({
      sku: 'IS-AOS-05628',
      name: 'Toyota 2000GT Red',
      brand: 'Aoshima',
      category: 'Model Kits',
      productType: 'Plastic model kit',
      supplierSku: '05628',
      manufacturerReference: '05628',
      sourceMediaLinks: [{ url: 'https://source.example/product', sourceType: 'supplier', permissionBasis: 'authorised' }],
    });

    expect(copy.shortDescription).toContain('Toyota 2000GT Red');
    expect(copy.description).toContain('Aoshima');
    expect(copy.features).toContain('Toyota 2000GT colour variant: Red');
    expect(copy.specifications).toMatchObject({ manufacturer: 'Aoshima', supplierCode: '05628' });
    expect(copy.omittedUncertainSpecifications).toContain('piece count');
    expect(copy.description).not.toMatch(/perfect for collectors and hobbyists/i);
  });

  it('generates tool copy around the actual bench use without unsupported performance claims', () => {
    const copy = generateIronSprueProductDescription({
      sku: 'IS-DLM-AD43',
      name: 'Roket Hot Cyano 20g',
      brand: 'Deluxe Materials',
      category: 'Adhesives & Finishing',
      productType: 'Adhesive and finishing product',
      supplierSku: 'AD43',
    });

    expect(copy.shortDescription).toContain('adhesive and assembly work');
    expect(copy.description).toContain('manufacturer packaging');
    expect(copy.description).not.toMatch(/cures in|bonds all|waterproof|non-toxic/i);
  });
});
