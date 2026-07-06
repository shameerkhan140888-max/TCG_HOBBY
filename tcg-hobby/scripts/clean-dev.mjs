import { execFileSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const paths = [
  join(root, 'apps', 'storefront', '.next'),
  join(root, 'apps', 'admin', '.next'),
  join(root, 'apps', 'mobile', '.expo'),
  join(root, '.turbo'),
];

function getListeningPids(port) {
  try {
    const result = execFileSync('cmd', ['/c', `netstat -ano -p tcp | findstr :${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes('LISTENING'))
      .map((line) => Number.parseInt(line.split(/\s+/).at(-1) ?? '', 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {
    // Ignore stale process cleanup failures; a fresh start can still succeed if the
    // process already exited or cannot be terminated.
  }
}

for (const port of [3000, 3001, 4000, 8081]) {
  for (const pid of getListeningPids(port)) {
    killPid(pid);
  }
}

for (const target of paths) {
  await rm(target, { recursive: true, force: true });
}
