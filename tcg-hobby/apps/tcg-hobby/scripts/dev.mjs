import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { configureWindowsPrismaEngine, loadRootDatabaseEnv } from '../../../scripts/lib/database-env.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..', '..', '..');

const env = {
  ...process.env,
};

try {
  loadRootDatabaseEnv({ rootDir: workspaceRoot, env, logger: console.log });
  configureWindowsPrismaEngine({ rootDir: workspaceRoot, env });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

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
