#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { configureWindowsPrismaEngine, defaultWorkspaceRoot, loadRootDatabaseEnv } from './lib/database-env.mjs';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Provide a command to run with the root database environment.');
  process.exit(1);
}

const env = { ...process.env };

try {
  loadRootDatabaseEnv({ rootDir: defaultWorkspaceRoot, env, logger: console.log });
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
