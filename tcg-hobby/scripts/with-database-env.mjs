#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { applyEnvFile, configureWindowsPrismaEngine, defaultWorkspaceRoot, loadRootDatabaseEnv } from './lib/database-env.mjs';
import { resolve } from 'node:path';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Provide a command to run with the root database environment.');
  process.exit(1);
}

const env = { ...process.env };
const isAdminWorkspace = resolve(process.cwd()) === resolve(defaultWorkspaceRoot, 'apps/admin');

try {
  if (isAdminWorkspace) {
    loadRootDatabaseEnv({
      rootDir: defaultWorkspaceRoot,
      env,
      logger: undefined,
      requireDatabaseUrl: false,
    });
    applyEnvFile(resolve(defaultWorkspaceRoot, 'apps/iron-sprue/.env.local'), env);
  } else {
    applyEnvFile(resolve(defaultWorkspaceRoot, 'apps/iron-sprue/.env.local'), env);
    loadRootDatabaseEnv({
      rootDir: defaultWorkspaceRoot,
      env,
      logger: console.log,
      requireDatabaseUrl: true,
    });
  }
  if (isAdminWorkspace && !env.DATABASE_URL && !env.IRON_SPRUE_ADMIN_DATABASE_URL) {
    throw new Error('IRON_SPRUE_ADMIN_DATABASE_URL is required for local Iron Sprue admin development when DATABASE_URL is not configured.');
  }
  configureWindowsPrismaEngine({ rootDir: defaultWorkspaceRoot, env });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
