import { PrismaClient } from '@prisma/client';
import { PrismaClient as WorkerPrismaClient } from '@prisma/client/wasm.js';
import { PrismaNeon, PrismaNeonHTTP } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  ironSprueAdminPrisma?: PrismaClient;
  ironSprueAdminPrismaUrl?: string;
};

const globalForPrisma = globalThis as PrismaGlobal;

function isCloudflareWorkerRuntime() {
  const runtimeGlobals = globalThis as typeof globalThis & {
    WebSocketPair?: unknown;
    caches?: { default?: unknown };
  };

  return (
    process.env.TCG_HOBBY_PRISMA_RUNTIME === 'worker' ||
    typeof runtimeGlobals.WebSocketPair !== 'undefined' ||
    typeof runtimeGlobals.caches?.default !== 'undefined'
  );
}

function createDatabaseUnavailableError() {
  return new Error(
    'Database client unavailable. Run `prisma generate` and ensure the production environment has a valid Prisma client before starting the app.',
  );
}

function createFallbackClient() {
  const error = createDatabaseUnavailableError();

  const modelProxy = new Proxy(
    {},
    {
      get() {
        return async () => {
          throw error;
        };
      },
    },
  );

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === '$disconnect' || prop === '$connect' || prop === '$on' || prop === '$use' || prop === '$transaction' || prop === '$extends') {
          return async () => undefined;
        }

        return modelProxy;
      },
    },
  ) as PrismaClient;
}

function createPrismaClient(connectionString = process.env.DATABASE_URL?.trim()) {
  try {
    const logLevels: Array<'error' | 'warn'> = ['error', 'warn'];
    const log = process.env.NODE_ENV === 'production' ? logLevels : undefined;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required for the Prisma driver adapter runtime.');
    }

    const isWorkerRuntime = isCloudflareWorkerRuntime();
    const normalizedConnectionString = isWorkerRuntime
      ? normalizeCloudflareWorkerConnectionString(connectionString)
      : normalizeNodePostgresConnectionString(connectionString);

    // Cloudflare Workers use PrismaNeonHTTP for the proven storefront read path.
    // Transaction-dependent commerce writes stay on the Node/Nest runtime.
    const adapter = isWorkerRuntime
      ? new PrismaNeonHTTP(normalizedConnectionString, {})
      : new PrismaPg({
          connectionString: normalizedConnectionString,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 5_000,
          max: 5,
        });

    const Client = isWorkerRuntime ? WorkerPrismaClient : PrismaClient;

    return new Client({
      adapter,
      ...(log ? { log } : {}),
    }) as PrismaClient;
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw createDatabaseUnavailableError();
    }

    return createFallbackClient();
  }
}

function normalizeCloudflareWorkerConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.delete('channel_binding');
  return url.toString();
}

function normalizeNodePostgresConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get('sslmode')?.toLowerCase();
  if ((sslMode === 'prefer' || sslMode === 'require' || sslMode === 'verify-ca') && !url.searchParams.has('uselibpqcompat')) {
    url.searchParams.set('uselibpqcompat', 'true');
  }
  return url.toString();
}

export type IronSprueAdminDatabaseTargetInfo = {
  connectionString: string;
  source: 'IRON_SPRUE_ADMIN_DATABASE_URL' | 'IRON_SPRUE_DATABASE_URL' | 'DATABASE_URL';
  environment: string;
  label: 'LOCAL' | 'STAGING' | 'RAILWAY PRODUCTION' | 'PRODUCTION' | 'UNKNOWN';
  host: string;
  database: string;
};

function parseDatabaseTarget(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname || 'unknown',
      database: url.pathname.replace(/^\/+/, '') || 'unknown',
    };
  } catch {
    return { host: 'invalid', database: 'invalid' };
  }
}

function classifyIronSprueAdminEnvironment(raw: string | undefined) {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return 'UNKNOWN' as const;
  if (normalized.includes('railway') && normalized.includes('prod')) return 'RAILWAY PRODUCTION' as const;
  if (normalized === 'production' || normalized === 'prod' || normalized === 'live') return 'PRODUCTION' as const;
  if (normalized.includes('stage') || normalized.includes('staging')) return 'STAGING' as const;
  if (normalized.includes('local') || normalized.includes('dev')) return 'LOCAL' as const;
  return 'UNKNOWN' as const;
}

export function getIronSprueAdminDatabaseTargetInfo(): IronSprueAdminDatabaseTargetInfo {
  const explicitAdminUrl = process.env.IRON_SPRUE_ADMIN_DATABASE_URL?.trim();
  const dedicatedIronSprueUrl = process.env.IRON_SPRUE_DATABASE_URL?.trim();
  const rootUrl = process.env.DATABASE_URL?.trim();
  const source = explicitAdminUrl
    ? 'IRON_SPRUE_ADMIN_DATABASE_URL'
    : dedicatedIronSprueUrl
      ? 'IRON_SPRUE_DATABASE_URL'
      : 'DATABASE_URL';
  const connectionString = explicitAdminUrl || dedicatedIronSprueUrl || rootUrl;
  if (!connectionString) {
    throw new Error('IRON_SPRUE_ADMIN_DATABASE_URL, IRON_SPRUE_DATABASE_URL or DATABASE_URL is required for Iron Sprue database access.');
  }
  const environment = process.env.IRON_SPRUE_ADMIN_ENVIRONMENT?.trim()
    || process.env.RAILWAY_ENVIRONMENT_NAME?.trim()
    || process.env.IRON_SPRUE_ENVIRONMENT?.trim()
    || process.env.NODE_ENV
    || 'unknown';
  return {
    connectionString,
    source,
    environment,
    label: classifyIronSprueAdminEnvironment(environment),
    ...parseDatabaseTarget(connectionString),
  };
}

function getDefaultPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getDefaultPrismaClient();
      const value = client[prop as keyof PrismaClient];
      return typeof value === 'function' ? value.bind(client) : value;
    },
    set(_target, prop, value) {
      const client = getDefaultPrismaClient() as PrismaClient & Record<PropertyKey, unknown>;
      client[prop] = value;
      return true;
    },
  },
) as PrismaClient;

export function getIronSprueAdminPrisma() {
  const { connectionString } = getIronSprueAdminDatabaseTargetInfo();
  if (!globalForPrisma.ironSprueAdminPrisma || globalForPrisma.ironSprueAdminPrismaUrl !== connectionString) {
    globalForPrisma.ironSprueAdminPrisma = createPrismaClient(connectionString);
    globalForPrisma.ironSprueAdminPrismaUrl = connectionString;
  }

  return globalForPrisma.ironSprueAdminPrisma;
}
