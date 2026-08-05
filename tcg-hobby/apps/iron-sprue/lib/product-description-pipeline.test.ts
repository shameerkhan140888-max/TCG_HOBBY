import { describe, expect, it } from 'vitest';
import { createIronSprueDescriptionPlan, IRON_SPRUE_DESCRIPTION_FIELDS, IRON_SPRUE_DESCRIPTION_RULES } from './product-description-pipeline';

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
});
