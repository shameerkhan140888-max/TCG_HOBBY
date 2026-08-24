import { spawnSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const storefrontRoot = fileURLToPath(new URL('..', import.meta.url));
const storefrontRootUrl = new URL('..', import.meta.url);
const workspaceRoot = fileURLToPath(new URL('../..', storefrontRootUrl));
const prismaGenerateDatabaseUrl = 'postgresql://prisma-generate:prisma-generate@localhost:5432/prisma_generate';
const productionApiBaseUrl = 'https://considerate-unity-production-b734.up.railway.app';
const localEnvFileNames = ['.env', '.env.local', '.env.production', '.env.development'];
const internalWorkspaceBuilds = [
  { workspace: '@tcg-hobby/types' },
  { workspace: '@tcg-hobby/utils' },
  { workspace: '@tcg-hobby/ui' },
  { workspace: '@tcg-hobby/auth' },
  { workspace: '@tcg-hobby/database', env: { DATABASE_URL: prismaGenerateDatabaseUrl } },
];

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
process.env.IRON_SPRUE_PRODUCTION_API_BASE_URL ??= productionApiBaseUrl;

// Prisma generate validates DATABASE_URL syntax but does not connect to the database.
for (const workspaceBuild of internalWorkspaceBuilds) {
  runWorkspaceCommand('npm', ['run', 'build', '-w', workspaceBuild.workspace], workspaceRoot, workspaceBuild.env);
}

const [command, args] = commands[mode];
withLocalEnvFilesHidden(() => {
  runWorkspaceCommand(command, args, storefrontRoot);
});

process.exit(0);

function withLocalEnvFilesHidden(callback) {
  const hiddenFiles = [];
  const candidateRoots = [...new Set([workspaceRoot, storefrontRoot])];
  const suffix = `.cloudflare-build-hidden-${process.pid}`;

  try {
    for (const root of candidateRoots) {
      for (const fileName of localEnvFileNames) {
        const source = join(root, fileName);
        if (!existsSync(source)) continue;
        const hidden = join(root, `${fileName}${suffix}`);
        renameSync(source, hidden);
        hiddenFiles.push({ source, hidden });
      }
    }

    callback();
  } finally {
    for (const { source, hidden } of hiddenFiles.reverse()) {
      if (existsSync(hidden)) renameSync(hidden, source);
    }
  }
}

function runWorkspaceCommand(command, args, cwd, envOverrides = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...envOverrides },
    shell: true,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
