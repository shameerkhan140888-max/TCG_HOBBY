import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, '../prisma/migrations');

function migrationNames() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function migrationSql(name: string) {
  return readFileSync(resolve(migrationsDir, name, 'migration.sql'), 'utf8');
}

describe('Prisma migration chain ordering', () => {
  it('creates temporary Product master-data text columns before catalogue backfill and removes them before product-management', () => {
    const names = migrationNames();
    const bridge = '20260718_000000_product_legacy_text_columns_for_catalogue_master_data';
    const catalogue = '20260718_catalogue_master_data';
    const cleanup = '20260718_catalogue_master_data_cleanup_legacy_text_columns';
    const productManagement = '20260718_product_management_foundation';

    expect(names.indexOf(bridge)).toBeGreaterThan(-1);
    expect(names.indexOf(bridge)).toBeLessThan(names.indexOf(catalogue));
    expect(names.indexOf(catalogue)).toBeLessThan(names.indexOf(cleanup));
    expect(names.indexOf(cleanup)).toBeLessThan(names.indexOf(productManagement));

    const bridgeSql = migrationSql(bridge);
    expect(bridgeSql).toContain('ADD COLUMN IF NOT EXISTS "brand" TEXT');
    expect(bridgeSql).toContain('ADD COLUMN IF NOT EXISTS "productType" TEXT');
    expect(bridgeSql).toContain('ADD COLUMN IF NOT EXISTS "language" TEXT');

    const cleanupSql = migrationSql(cleanup);
    expect(cleanupSql).toContain('20260718_product_management_foundation');
    expect(cleanupSql).toContain('DROP COLUMN IF EXISTS "brand"');
    expect(cleanupSql).toContain('DROP COLUMN IF EXISTS "productType"');
    expect(cleanupSql).toContain('DROP COLUMN IF EXISTS "language"');
  });
});
