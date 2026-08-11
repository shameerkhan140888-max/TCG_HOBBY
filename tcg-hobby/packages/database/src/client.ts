import { PrismaClient } from '@prisma/client';
import { PrismaClient as WorkerPrismaClient } from '@prisma/client/wasm.js';
import { PrismaNeon, PrismaNeonHTTP } from '@prisma/adapter-neon';

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
  ironSprueAdminPrisma?: PrismaClient;
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
      : connectionString;

    // Cloudflare Workers use PrismaNeonHTTP for the proven storefront read path.
    // Transaction-dependent commerce writes stay on the Node/Nest runtime.
    const adapter = isWorkerRuntime
      ? new PrismaNeonHTTP(normalizedConnectionString, {})
      : new PrismaNeon({
          connectionString: normalizedConnectionString,
          allowExitOnIdle: true,
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

export function getIronSprueAdminPrisma() {
  if (!globalForPrisma.ironSprueAdminPrisma) {
    globalForPrisma.ironSprueAdminPrisma = createPrismaClient(process.env.IRON_SPRUE_DATABASE_URL?.trim());
  }

  return globalForPrisma.ironSprueAdminPrisma;
}
