import { createHash } from 'node:crypto';

export const RAILWAY_PRODUCTION_TARGET = 'railway-production';
export const RAILWAY_PRODUCTION_CONFIRMATION = 'CONFIRM_IRON_SPRUE_RAILWAY_PRODUCTION_IMPORT';
export const RAILWAY_PRODUCTION_FINGERPRINT_ENV = 'IRON_SPRUE_RAILWAY_PRODUCTION_DATABASE_FINGERPRINT';

const NEON_HOST_PATTERN = /neon\.tech$/i;
const RAILWAY_HOST_PATTERNS = [
  /(^|\.)railway\.internal$/i,
  /(^|\.)proxy\.rlwy\.net$/i,
  /(^|\.)railway\.app$/i,
];

export function parseImportTarget(argv = [], env = process.env) {
  const targetArg = argv.find((arg) => arg.startsWith('--target='));
  return (targetArg ? targetArg.slice('--target='.length) : env.IRON_SPRUE_LAUNCH_IMPORT_TARGET || 'neon').trim();
}

export function isDryRun(argv = []) {
  return argv.includes('--dry-run');
}

export function redactDatabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  return {
    protocol: url.protocol,
    host: url.hostname,
    port: url.port || null,
    database: url.pathname.replace(/^\//, ''),
    sslmode: url.searchParams.get('sslmode') ?? null,
  };
}

export function fingerprintDatabaseUrl(rawUrl) {
  return createHash('sha256').update(rawUrl.trim()).digest('hex');
}

export function resolveIronSprueImportTarget({ targetMode, env, fileEnv = {}, dryRun }) {
  if (targetMode === RAILWAY_PRODUCTION_TARGET) {
    const databaseUrl = env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error('Railway production import requires DATABASE_URL from the Railway environment.');
    }
    assertRailwayProductionTarget(databaseUrl, env, { dryRun });
    return { mode: RAILWAY_PRODUCTION_TARGET, adapter: 'pg', databaseUrl };
  }

  if (targetMode !== 'neon') {
    throw new Error(`Unsupported Iron Sprue launch import target "${targetMode}". Use "neon" or "${RAILWAY_PRODUCTION_TARGET}".`);
  }

  const databaseUrl = env.IRON_SPRUE_DATABASE_URL?.trim() || fileEnv.IRON_SPRUE_DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error('IRON_SPRUE_DATABASE_URL is required for the launch catalogue import.');
  assertNeonIronSprueTarget(databaseUrl, env);
  return { mode: 'neon', adapter: 'neon', databaseUrl };
}

export function assertNeonIronSprueTarget(rawUrl, env = process.env) {
  const url = new URL(rawUrl);
  if (!NEON_HOST_PATTERN.test(url.hostname)) {
    throw new Error('Iron Sprue launch import must target the dedicated Neon host.');
  }
  assertNotTcgTarget(rawUrl, env);
}

export function assertRailwayProductionTarget(rawUrl, env = process.env, options = {}) {
  const url = new URL(rawUrl);
  if (!RAILWAY_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new Error('Railway production import must target a Railway PostgreSQL host.');
  }

  const environmentName = env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_ENVIRONMENT || '';
  if (environmentName.toLowerCase() !== 'production') {
    throw new Error('Railway production import requires RAILWAY_ENVIRONMENT_NAME=production.');
  }

  assertNotTcgTarget(rawUrl, env);
  assertRailwayProductionFingerprint(rawUrl, env);

  if (!options.dryRun && env.IRON_SPRUE_ALLOW_RAILWAY_PRODUCTION_IMPORT !== RAILWAY_PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Railway production import requires IRON_SPRUE_ALLOW_RAILWAY_PRODUCTION_IMPORT=${RAILWAY_PRODUCTION_CONFIRMATION}.`,
    );
  }
}

function assertRailwayProductionFingerprint(rawUrl, env = process.env) {
  const expectedFingerprint = env[RAILWAY_PRODUCTION_FINGERPRINT_ENV]?.trim();
  if (!expectedFingerprint) {
    throw new Error(`Railway production import requires ${RAILWAY_PRODUCTION_FINGERPRINT_ENV}.`);
  }
  if (!/^[a-f0-9]{64}$/i.test(expectedFingerprint)) {
    throw new Error(`${RAILWAY_PRODUCTION_FINGERPRINT_ENV} must be a SHA-256 hex digest.`);
  }
  if (fingerprintDatabaseUrl(rawUrl) !== expectedFingerprint.toLowerCase()) {
    throw new Error(`Railway production DATABASE_URL does not match ${RAILWAY_PRODUCTION_FINGERPRINT_ENV}.`);
  }
}

function assertNotTcgTarget(rawUrl, env = process.env) {
  const url = new URL(rawUrl);
  if (/tcg[-_]?hobby/i.test(url.hostname) || /tcg[-_]?hobby/i.test(url.pathname)) {
    throw new Error('Iron Sprue launch import resolved a TCG Hobby-looking database target.');
  }
  const disallowedNames = ['TCG_HOBBY_DATABASE_URL', 'TCG_DATABASE_URL', 'DIRECT_DATABASE_URL'];
  for (const name of disallowedNames) {
    if (env[name]?.trim() && env[name].trim() === rawUrl) {
      throw new Error(`Iron Sprue launch import must not reuse ${name}.`);
    }
  }
}
