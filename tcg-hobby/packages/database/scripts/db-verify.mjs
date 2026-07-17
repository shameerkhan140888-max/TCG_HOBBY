import { PrismaClient } from '@prisma/client';
import { configureWindowsPrismaEngine, loadRootDatabaseEnv } from '../../../scripts/lib/database-env.mjs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../..');
const env = { ...process.env };

try {
  loadRootDatabaseEnv({ rootDir, env, logger: console.log });
  configureWindowsPrismaEngine({ rootDir, env });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  console.log('Connecting to database...');
  await prisma.$connect();

  const [categoryCount, supplierCount, productCount] = await Promise.all([
    prisma.category.count(),
    prisma.supplier.count(),
    prisma.product.count(),
  ]);

  console.log(`Categories: ${categoryCount}`);
  console.log(`Suppliers: ${supplierCount}`);
  console.log(`Products: ${productCount}`);
  console.log('Database verification complete.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
