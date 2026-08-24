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
    expect(source).toContain('withLocalEnvFilesHidden(runSelectedCommand)');
    expect(source).toContain("'.env.local'");
    expect(source).toContain('renameSync(source, hidden)');
    expect(source).toContain('renameSync(hidden, source)');
  });

  it('exposes an OpenNext deploy mode so Git deployments publish the Worker, not static assets only', () => {
    expect(source).toContain("deploy: ['opennextjs-cloudflare', ['deploy']]");
    expect(source).toContain("build: ['opennextjs-cloudflare', ['build']]");
  });

  it('passes additional CLI arguments through to OpenNext or Wrangler', () => {
    expect(source).toContain('const passthroughArgs = process.argv.slice(3)');
    expect(source).toContain('[...args, ...passthroughArgs]');
  });

  it('throws command failures so hidden local env files are restored before exit', () => {
    expect(source).toContain('class CommandFailedError extends Error');
    expect(source).toContain('throw new CommandFailedError(result.status ?? 1)');
    expect(source).toContain('error instanceof CommandFailedError');
  });

  it('restores hidden local env files when a packaging command is interrupted', () => {
    expect(source).toContain("['SIGINT', 130]");
    expect(source).toContain("['SIGTERM', 143]");
    expect(source).toContain('restoreHiddenLocalEnvFiles()');
  });

  it('does not hide local env files for long-running preview sessions', () => {
    expect(source).toContain("if (mode === 'preview')");
    expect(source).toContain('withLocalEnvFilesHidden(runSelectedCommand)');
  });
});
