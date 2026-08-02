import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const storefrontRoot = fileURLToPath(new URL('..', import.meta.url));
const storefrontRootUrl = new URL('..', import.meta.url);
const workspaceRoot = fileURLToPath(new URL('../..', storefrontRootUrl));

const mode = process.argv[2] ?? 'build';
const commands = {
  build: ['opennextjs-cloudflare', ['build']],
  preview: ['opennextjs-cloudflare', ['preview']],
  'dry-run': ['wrangler', ['deploy', '--dry-run', '--outdir', '.open-next-dry-run']],
};

if (!Object.hasOwn(commands, mode)) {
  console.error(`Unknown Cloudflare command: ${mode}`);
  process.exit(1);
}

process.env.TCG_HOBBY_CLOUDFLARE_UNOPTIMIZED_IMAGES = '1';
process.env.NEXTJS_ENV ??= 'production';

if (mode !== 'build') {
  process.env.TCG_HOBBY_PRISMA_RUNTIME = 'worker';
}

if (mode !== 'build') {
  ensurePrismaWasmModuleDirectory();
}

const [command, args] = commands[mode];
const result = spawnSync(command, args, {
  cwd: storefrontRootUrl,
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (mode === 'build') {
  copyPrismaWasmAssets();
}

process.exit(0);

function getPrismaWasmModuleDirectory() {
  return join(storefrontRoot, '.open-next', '.worker-files', 'node_modules', '.prisma', 'client');
}

function ensurePrismaWasmModuleDirectory() {
  mkdirSync(getPrismaWasmModuleDirectory(), { recursive: true });
}

function copyPrismaWasmAssets() {
  const sourceDirectory = findPrismaWasmDirectory();
  const targetDirectory = getPrismaWasmModuleDirectory();

  if (!existsSync(sourceDirectory)) {
    return;
  }

  const wasmFiles = readdirSync(sourceDirectory).filter((file) => file === 'query_compiler_bg.wasm');
  if (wasmFiles.length === 0) {
    return;
  }

  mkdirSync(targetDirectory, { recursive: true });

  for (const file of wasmFiles) {
    cpSync(join(sourceDirectory, file), join(targetDirectory, file));
  }

  console.log(`Copied ${wasmFiles.length} Prisma WASM asset(s) into the OpenNext worker bundle.`);
}

function findPrismaWasmDirectory() {
  const candidates = [
    join(storefrontRoot, '.next', 'server', 'static', 'wasm'),
    join(storefrontRoot, '.next', 'server', 'chunks', 'static', 'wasm'),
    join(workspaceRoot, 'node_modules', '.prisma', 'client'),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}
