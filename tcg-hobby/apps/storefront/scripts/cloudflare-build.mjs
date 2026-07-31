import { spawnSync } from 'node:child_process';

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

const [command, args] = commands[mode];
const result = spawnSync(command, args, {
  cwd: new URL('..', import.meta.url),
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
