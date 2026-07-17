import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const defaultWorkspaceRoot = resolve(scriptDir, '../..');

export class DatabaseEnvironmentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseEnvironmentError';
  }
}

export function isPostgresDatabaseUrl(value) {
  return typeof value === 'string' && /^postgres(?:ql)?:\/\//.test(value);
}

export function getSafeDatabaseTarget(value) {
  if (!value) {
    return 'not configured';
  }

  try {
    const parsed = new URL(value);
    return parsed.hostname || 'unknown host';
  } catch {
    return 'invalid DATABASE_URL';
  }
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  const entries = [];
  const contents = readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.push([key, value]);
  }

  return entries;
}

function applyEnvFile(filePath, env) {
  for (const [key, value] of readEnvFile(filePath)) {
    if (env[key] === undefined || env[key] === '') {
      env[key] = value;
    }
  }
}

export function loadRootDatabaseEnv(options = {}) {
  const rootDir = options.rootDir ?? defaultWorkspaceRoot;
  const env = options.env ?? process.env;
  const requireDatabaseUrl = options.requireDatabaseUrl ?? true;
  const logger = options.logger;
  const explicitDatabaseUrl = env.DATABASE_URL;
  const envLocalPath = resolve(rootDir, '.env.local');
  const envPath = resolve(rootDir, '.env');

  if (explicitDatabaseUrl && !isPostgresDatabaseUrl(explicitDatabaseUrl)) {
    throw new DatabaseEnvironmentError(
      'Invalid DATABASE_URL in the current process. Expected a PostgreSQL URL starting with postgresql:// or postgres://. Refusing to override an explicit process value.',
    );
  }

  applyEnvFile(envLocalPath, env);
  applyEnvFile(envPath, env);

  if (env.DATABASE_URL && !isPostgresDatabaseUrl(env.DATABASE_URL)) {
    throw new DatabaseEnvironmentError(
      'Invalid DATABASE_URL loaded from root environment files. Expected a PostgreSQL URL starting with postgresql:// or postgres://.',
    );
  }

  if (requireDatabaseUrl && !env.DATABASE_URL) {
    throw new DatabaseEnvironmentError(
      'DATABASE_URL is not configured. Add a real PostgreSQL connection string to root .env.local or export DATABASE_URL before running database commands. .env.example is documentation only and is never loaded as runtime configuration.',
    );
  }

  if (env.DATABASE_URL && logger) {
    logger(`Database target: ${getSafeDatabaseTarget(env.DATABASE_URL)}`);
  }

  return {
    databaseUrl: env.DATABASE_URL,
    target: getSafeDatabaseTarget(env.DATABASE_URL),
    loadedFiles: [envLocalPath, envPath].filter((filePath) => existsSync(filePath)),
  };
}

export function configureWindowsPrismaEngine(options = {}) {
  const rootDir = options.rootDir ?? defaultWorkspaceRoot;
  const env = options.env ?? process.env;
  const localEnginePath = resolve(rootDir, 'node_modules/@prisma/engines/query_engine-windows.dll.node');

  if (process.platform === 'win32' && existsSync(localEnginePath) && !env.PRISMA_QUERY_ENGINE_LIBRARY) {
    env.PRISMA_QUERY_ENGINE_LIBRARY = localEnginePath;
  }
}
