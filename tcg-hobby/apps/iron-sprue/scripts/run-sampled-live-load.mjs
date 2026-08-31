#!/usr/bin/env node

import { spawn } from 'node:child_process';

const profile = readArg('--profile') || 'storefront-moderate';
const durationMs = Number(readArg('--duration-ms') ?? 30_000);
const intervalMs = Number(readArg('--interval-ms') ?? 1_000);
const port = readArg('--port') || '64843';
const fullOutput = process.argv.includes('--full');
const nodeCommand = process.execPath;
const tunnelCommand = process.platform === 'win32'
  ? {
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `railway connect Postgres --tunnel-only -P ${port}`],
    }
  : {
      command: 'railway',
      args: ['connect', 'Postgres', '--tunnel-only', '-P', port],
    };

const tunnel = spawn(tunnelCommand.command, tunnelCommand.args, {
  cwd: process.cwd(),
  windowsHide: true,
});

let tunnelOutput = '';
let tunnelReady = false;

tunnel.stdout.on('data', (chunk) => {
  tunnelOutput += chunk.toString();
});
tunnel.stderr.on('data', (chunk) => {
  tunnelOutput += chunk.toString();
});

try {
  const databaseUrl = await waitForDatabaseUrl();
  tunnelReady = true;
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    RAILWAY_ENVIRONMENT_NAME: 'production',
  };

  const sampler = spawn(
    nodeCommand,
    ['apps/iron-sprue/scripts/sample-railway-db-connections.mjs', `--duration-ms=${durationMs}`, `--interval-ms=${intervalMs}`],
    { cwd: process.cwd(), env, windowsHide: true },
  );
  const load = profile === 'db-sample-only'
    ? spawn(
        nodeCommand,
        ['-e', `setTimeout(() => {}, ${durationMs})`],
        { cwd: process.cwd(), env: process.env, windowsHide: true },
      )
    : spawn(
        nodeCommand,
        ['apps/iron-sprue/scripts/live-staging-load-check.mjs', `--profile=${profile}`],
        { cwd: process.cwd(), env: process.env, windowsHide: true },
      );

  const [loadResult, samplerResult] = await Promise.all([
    collectChild(load),
    collectChild(sampler),
  ]);

  const loadJson = parseJsonOutput(loadResult.stdout);
  const databaseJson = parseJsonOutput(samplerResult.stdout);

  console.log(JSON.stringify({
    profile,
    sampledDatabase: true,
    load: fullOutput ? loadJson : summarizeLoad(loadJson),
    database: fullOutput ? databaseJson : summarizeDatabase(databaseJson),
    loadExitCode: loadResult.code,
    samplerExitCode: samplerResult.code,
    errors: [
      ...redactedError('load', loadResult.stderr),
      ...redactedError('sampler', samplerResult.stderr),
    ],
  }, null, 2));

  process.exit(loadResult.code || samplerResult.code || 0);
} finally {
  if (!tunnelReady && tunnelOutput) {
    const redacted = tunnelOutput
      .replace(/postgresql:\/\/[^\s]+/g, 'postgresql://[redacted]')
      .replace(/Password:\s+\S+/g, 'Password: [redacted]');
    console.error(redacted);
  }
  tunnel.kill('SIGINT');
}

function waitForDatabaseUrl() {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 30_000;
    const timer = setInterval(() => {
      const match = tunnelOutput.match(/URL:\s+(postgresql:\/\/\S+)/);
      if (match?.[1]) {
        clearInterval(timer);
        resolve(match[1].trim());
      } else if (Date.now() > deadline) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for Railway Postgres tunnel URL.'));
      }
    }, 250);
    tunnel.once('exit', (code) => {
      if (!tunnelReady) {
        clearInterval(timer);
        reject(new Error(`Railway Postgres tunnel exited before becoming ready with code ${code ?? 'unknown'}.`));
      }
    });
  });
}

function collectChild(child) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('exit', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

function parseJsonOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function redactedError(source, text) {
  if (!text.trim()) return [];
  return [{
    source,
    message: text
      .replace(/postgresql:\/\/[^\s]+/g, 'postgresql://[redacted]')
      .replace(/Password:\s+\S+/g, 'Password: [redacted]'),
  }];
}

function summarizeLoad(load) {
  if (!load) return null;
  const allEntries = load.summary ?? [];
  const allErrors = load.errors ?? [];
  const durations = allEntries.flatMap((entry) => [entry.p50Ms, entry.p95Ms, entry.maxMs].filter((value) => Number.isFinite(value)));
  return {
    profile: load.profile,
    startedAt: load.startedAt,
    endedAt: load.endedAt,
    concurrency: load.concurrency,
    iterations: load.iterations,
    routeCount: allEntries.length,
    totalRequests: allEntries.reduce((total, entry) => total + Number(entry.count ?? 0), 0),
    totalErrors: allErrors.length,
    p50Ms: percentile(allEntries.map((entry) => entry.p50Ms), 50),
    p95Ms: percentile(allEntries.map((entry) => entry.p95Ms), 95),
    p99Ms: percentile(allEntries.map((entry) => entry.p99Ms ?? entry.maxMs), 99),
    maxMs: durations.length ? Math.max(...durations) : 0,
    media: allEntries.filter((entry) => entry.name.startsWith('media.')),
    api: allEntries.filter((entry) => entry.name.startsWith('api.')),
    admin: allEntries.filter((entry) => entry.name.startsWith('admin.')),
    checkout: allEntries.filter((entry) => entry.name.includes('checkout')),
    slowestRoutes: [...allEntries].sort((a, b) => Number(b.p95Ms ?? 0) - Number(a.p95Ms ?? 0)).slice(0, 8),
    errors: allErrors.slice(0, 12),
    safety: load.safety,
    targets: load.targets,
  };
}

function summarizeDatabase(database) {
  if (!database) return null;
  return {
    startedAt: database.startedAt,
    endedAt: database.endedAt,
    target: database.target,
    sampleCount: database.sampleCount,
    peaks: database.peaks,
    final: database.final,
  };
}

function percentile(values, target) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.ceil((target / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, Math.min(index, sorted.length - 1))] * 100) / 100;
}

function readArg(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}
