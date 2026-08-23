import { describe, expect, it } from 'vitest';
import {
  RAILWAY_PRODUCTION_CONFIRMATION,
  RAILWAY_PRODUCTION_FINGERPRINT_ENV,
  assertNeonIronSprueTarget,
  assertRailwayProductionTarget,
  fingerprintDatabaseUrl,
  parseImportTarget,
  resolveIronSprueImportTarget,
} from './launch-catalogue-target.mjs';

const neonUrl = 'postgresql://iron:secret@ep-iron-sprue.eu-west-2.aws.neon.tech/iron_sprue?sslmode=require';
const railwayUrl = 'postgresql://postgres:secret@postgres.railway.internal:5432/railway';
const railwayEnv = {
  DATABASE_URL: railwayUrl,
  RAILWAY_ENVIRONMENT_NAME: 'production',
  [RAILWAY_PRODUCTION_FINGERPRINT_ENV]: fingerprintDatabaseUrl(railwayUrl),
};

describe('Iron Sprue launch catalogue target guards', () => {
  it('keeps the default Neon guard and rejects non-Neon hosts', () => {
    expect(() => assertNeonIronSprueTarget(railwayUrl, {})).toThrow(/dedicated Neon host/);
    expect(() => assertNeonIronSprueTarget(neonUrl, {})).not.toThrow();
  });

  it('rejects TCG-looking targets for Neon imports', () => {
    expect(() => assertNeonIronSprueTarget('postgresql://iron:secret@ep-tcg-hobby.eu-west-2.aws.neon.tech/iron_sprue', {})).toThrow(
      /TCG Hobby-looking/,
    );
  });

  it('requires explicit Railway production mode to use DATABASE_URL', () => {
    const result = resolveIronSprueImportTarget({
      targetMode: 'railway-production',
      dryRun: true,
      env: railwayEnv,
    });

    expect(result).toEqual({
      mode: 'railway-production',
      adapter: 'pg',
      databaseUrl: railwayUrl,
    });
  });

  it('blocks Railway production writes without the explicit import confirmation', () => {
    expect(() =>
      assertRailwayProductionTarget(railwayUrl, railwayEnv, { dryRun: false }),
    ).toThrow(/IRON_SPRUE_ALLOW_RAILWAY_PRODUCTION_IMPORT/);

    expect(() =>
      assertRailwayProductionTarget(
        railwayUrl,
        {
          ...railwayEnv,
          IRON_SPRUE_ALLOW_RAILWAY_PRODUCTION_IMPORT: RAILWAY_PRODUCTION_CONFIRMATION,
        },
        { dryRun: false },
      ),
    ).not.toThrow();
  });

  it('rejects Railway mode outside the Railway production environment', () => {
    expect(() => assertRailwayProductionTarget(railwayUrl, { ...railwayEnv, RAILWAY_ENVIRONMENT_NAME: 'staging' }, { dryRun: true })).toThrow(
      /RAILWAY_ENVIRONMENT_NAME=production/,
    );
  });

  it('requires the Railway production database fingerprint to match DATABASE_URL', () => {
    expect(() =>
      assertRailwayProductionTarget(
        railwayUrl,
        {
          DATABASE_URL: railwayUrl,
          RAILWAY_ENVIRONMENT_NAME: 'production',
        },
        { dryRun: true },
      ),
    ).toThrow(/IRON_SPRUE_RAILWAY_PRODUCTION_DATABASE_FINGERPRINT/);

    expect(() =>
      assertRailwayProductionTarget(
        railwayUrl,
        {
          DATABASE_URL: railwayUrl,
          RAILWAY_ENVIRONMENT_NAME: 'production',
          [RAILWAY_PRODUCTION_FINGERPRINT_ENV]: fingerprintDatabaseUrl('postgresql://postgres:secret@other.proxy.rlwy.net:5432/railway'),
        },
        { dryRun: true },
      ),
    ).toThrow(/does not match/);
  });

  it('does not accept arbitrary PostgreSQL URLs in Railway production mode', () => {
    expect(() =>
      assertRailwayProductionTarget(
        'postgresql://postgres:secret@example.com:5432/railway',
        { ...railwayEnv, DATABASE_URL: 'postgresql://postgres:secret@example.com:5432/railway' },
        { dryRun: true },
      ),
    ).toThrow(/Railway PostgreSQL host/);
  });

  it('parses the target from argv or environment with Neon as the default', () => {
    expect(parseImportTarget(['node', 'script'])).toBe('neon');
    expect(parseImportTarget(['node', 'script', '--target=railway-production'])).toBe('railway-production');
    expect(parseImportTarget(['node', 'script'], { IRON_SPRUE_LAUNCH_IMPORT_TARGET: 'railway-production' })).toBe('railway-production');
  });
});
