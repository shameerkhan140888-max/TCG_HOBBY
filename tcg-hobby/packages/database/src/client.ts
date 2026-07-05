import { PrismaClient } from '@prisma/client';

type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

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

function createPrismaClient() {
  try {
    const logLevels: Array<'error' | 'warn'> = ['error', 'warn'];
    const options = process.env.NODE_ENV === 'production' ? { log: logLevels } : undefined;

    return new PrismaClient(options);
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw createDatabaseUnavailableError();
    }

    return createFallbackClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
