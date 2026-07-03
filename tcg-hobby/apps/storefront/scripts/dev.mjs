import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const env = {
  ...process.env,
  TCG_HOBBY_CATALOGUE_DATA_SOURCE: process.env.TCG_HOBBY_CATALOGUE_DATA_SOURCE ?? 'seed',
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..', '..', '..');
const nextCli = path.join(workspaceRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextCli, 'dev', '--port', '3000'], {
  stdio: 'inherit',
  env,
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
