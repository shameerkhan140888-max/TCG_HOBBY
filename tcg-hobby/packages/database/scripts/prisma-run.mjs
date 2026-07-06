import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../..');
const env = { ...process.env };
const localEnginePath = resolve(rootDir, 'node_modules/@prisma/engines/query_engine-windows.dll.node');
const prismaCli = require.resolve('prisma/build/index.js');
const generatedClientDir = resolve(rootDir, 'node_modules/.prisma/client');
const generatedEnginePath = resolve(generatedClientDir, 'query_engine-windows.dll.node');
const bundledEnginePath = resolve(rootDir, 'node_modules/@prisma/engines/query_engine-windows.dll.node');

function applyEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

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
    if (!key || env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }
}

applyEnvFile(resolve(rootDir, '.env'));
applyEnvFile(resolve(rootDir, '.env.example'));

if (process.platform === 'win32' && existsSync(localEnginePath) && !env.PRISMA_QUERY_ENGINE_LIBRARY) {
  env.PRISMA_QUERY_ENGINE_LIBRARY = localEnginePath;
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
if (process.platform === 'win32' && commandArgs[0] === 'generate' && existsSync(generatedEnginePath)) {
  process.exit(0);
}
if (process.platform === 'win32' && env.TCG_HOBBY_PRISMA_NO_ENGINE === '1' && commandArgs[0] === 'generate') {
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
