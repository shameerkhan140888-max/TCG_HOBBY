import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getSafeDatabaseTarget,
  isPostgresDatabaseUrl,
  loadRootDatabaseEnv,
} from '../../../scripts/lib/database-env.mjs';

const tempFolders = [];

async function createRoot(files = {}) {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'tcg-db-env-'));
  tempFolders.push(folder);
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(folder, name), contents);
  }
  return folder;
}

afterEach(async () => {
  await Promise.all(tempFolders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

describe('database environment loader', () => {
  it('loads DATABASE_URL from root .env.local', async () => {
    const rootDir = await createRoot({
      '.env.local': 'DATABASE_URL="postgresql://user:pass@db.example.test:5432/tcg?schema=public"',
    });
    const env = {};

    const result = loadRootDatabaseEnv({ rootDir, env });

    expect(result.target).toBe('db.example.test');
    expect(env.DATABASE_URL).toContain('db.example.test');
  });

  it('keeps an explicit process DATABASE_URL ahead of root files', async () => {
    const rootDir = await createRoot({
      '.env.local': 'DATABASE_URL="postgresql://user:pass@file.example.test:5432/tcg?schema=public"',
    });
    const env = {
      DATABASE_URL: 'postgresql://user:pass@process.example.test:5432/tcg?schema=public',
    };

    const result = loadRootDatabaseEnv({ rootDir, env });

    expect(result.target).toBe('process.example.test');
    expect(env.DATABASE_URL).toContain('process.example.test');
  });

  it('does not load .env.example as runtime configuration', async () => {
    const rootDir = await createRoot({
      '.env.example': 'DATABASE_URL="postgresql://user:pass@example-only.test:5432/tcg?schema=public"',
    });

    expect(() => loadRootDatabaseEnv({ rootDir, env: {} })).toThrow('DATABASE_URL is not configured');
  });

  it('rejects invalid explicit DATABASE_URL values instead of overriding them', async () => {
    const rootDir = await createRoot({
      '.env.local': 'DATABASE_URL="postgresql://user:pass@file.example.test:5432/tcg?schema=public"',
    });

    expect(() => loadRootDatabaseEnv({ rootDir, env: { DATABASE_URL: 'not-a-postgres-url' } })).toThrow(
      'Invalid DATABASE_URL in the current process',
    );
  });

  it('reports a safe hostname without credentials', () => {
    expect(isPostgresDatabaseUrl('postgres://user:secret@safe.example.test/db')).toBe(true);
    expect(getSafeDatabaseTarget('postgres://user:secret@safe.example.test/db')).toBe('safe.example.test');
  });
});
