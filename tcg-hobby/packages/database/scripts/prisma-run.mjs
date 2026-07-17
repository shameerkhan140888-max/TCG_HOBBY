import { existsSync, readdirSync, rmSync } from 'node:fs';
import { copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureWindowsPrismaEngine, loadRootDatabaseEnv } from '../../../scripts/lib/database-env.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../..');
const env = { ...process.env };
const prismaCli = require.resolve('prisma/build/index.js');
const generatedClientDir = resolve(rootDir, 'node_modules/.prisma/client');
const generatedEnginePath = resolve(generatedClientDir, 'query_engine-windows.dll.node');
const bundledEnginePath = resolve(rootDir, 'node_modules/@prisma/engines/query_engine-windows.dll.node');

try {
  loadRootDatabaseEnv({ rootDir, env, logger: console.log });
  configureWindowsPrismaEngine({ rootDir, env });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (process.platform === 'win32' && existsSync(generatedClientDir)) {
  try {
    if (existsSync(generatedEnginePath)) {
      rmSync(generatedEnginePath, { force: true });
    }

    for (const entry of readdirSync(generatedClientDir)) {
      if (entry.startsWith('query_engine-windows.dll.node.tmp')) {
        rmSync(resolve(generatedClientDir, entry), { force: true });
      }
    }
  } catch {
    // The generator will surface a useful error if the file truly cannot be replaced.
  }
}

const prismaArgs = process.argv.slice(2);
const commandArgs = prismaArgs.length ? prismaArgs : ['generate'];
if (process.platform === 'win32' && commandArgs[0] === 'generate' && env.TCG_HOBBY_PRISMA_NO_ENGINE === '1') {
  commandArgs.push('--no-engine');
}
const result = spawnSync(process.execPath, [prismaCli, ...commandArgs], {
  stdio: 'inherit',
  env,
});

if (result.status === 0 && process.platform === 'win32' && existsSync(bundledEnginePath)) {
  try {
    copyFileSync(bundledEnginePath, generatedEnginePath);
  } catch {
    // The generated client can still work in environments that use a different engine shape.
  }
}

process.exit(result.status ?? 1);
