import { PrismaClient } from '@prisma/client';
import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureWindowsPrismaEngine, loadRootDatabaseEnv } from '../../../scripts/lib/database-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../..');
const migrationsDir = resolve(__dirname, '../prisma/migrations');
const env = { ...process.env };

try {
  loadRootDatabaseEnv({ rootDir, env, logger: console.log });
  configureWindowsPrismaEngine({ rootDir, env });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function isMigrationFolder(name) {
  return name !== 'migration_lock.toml' && !name.startsWith('.') && !name.endsWith('.md');
}

const prisma = new PrismaClient();

try {
  console.log('Checking migration status...');
  const localMigrations = (await readdir(migrationsDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && isMigrationFolder(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  await prisma.$connect();
  const databaseMigrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at, logs
    FROM _prisma_migrations
    ORDER BY started_at ASC
  `;

  const appliedNames = new Set(
    databaseMigrations
      .filter((migration) => migration.finished_at && !migration.rolled_back_at)
      .map((migration) => migration.migration_name),
  );
  const failed = databaseMigrations.filter((migration) => !migration.finished_at || migration.rolled_back_at || migration.logs);
  const missing = localMigrations.filter((migration) => !appliedNames.has(migration));
  const unknown = databaseMigrations
    .map((migration) => migration.migration_name)
    .filter((migration) => !localMigrations.includes(migration));

  console.log(`Local migrations: ${localMigrations.length}`);
  console.log(`Applied migrations: ${appliedNames.size}`);

  if (failed.length || missing.length || unknown.length) {
    if (failed.length) {
      console.error(`Failed or rolled-back migrations: ${failed.map((migration) => migration.migration_name).join(', ')}`);
    }
    if (missing.length) {
      console.error(`Migrations pending in database: ${missing.join(', ')}`);
    }
    if (unknown.length) {
      console.error(`Database has migrations not present locally: ${unknown.join(', ')}`);
    }

    process.exitCode = 1;
  } else {
    console.log('Database schema is up to date with local migrations.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
