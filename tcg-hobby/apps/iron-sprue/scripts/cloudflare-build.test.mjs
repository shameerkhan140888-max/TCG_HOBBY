import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'cloudflare-build.mjs');
const source = readFileSync(scriptPath, 'utf8');

describe('Iron Sprue Cloudflare build wrapper', () => {
  it('prebuilds all internal workspace dependencies before OpenNext', () => {
    const expectedOrder = [
      '@tcg-hobby/types',
      '@tcg-hobby/utils',
      '@tcg-hobby/ui',
      '@tcg-hobby/auth',
      '@tcg-hobby/database',
    ];
    const positions = expectedOrder.map((workspace) => source.indexOf(`workspace: '${workspace}'`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
  });

  it('keeps the dummy database URL scoped to the database workspace build', () => {
    expect(source).toContain('prismaGenerateDatabaseUrl');
    expect(source).toContain("env: { DATABASE_URL: prismaGenerateDatabaseUrl }");
    expect(source).not.toContain('process.env.DATABASE_URL');
  });

  it('hides local env files before invoking OpenNext so secrets cannot be bundled', () => {
    expect(source).toContain('withLocalEnvFilesHidden(() =>');
    expect(source).toContain("'.env.local'");
    expect(source).toContain('renameSync(source, hidden)');
    expect(source).toContain('renameSync(hidden, source)');
  });
});
