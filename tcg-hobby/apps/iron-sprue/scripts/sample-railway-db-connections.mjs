#!/usr/bin/env node

import pg from 'pg';

const { Client } = pg;

const durationMs = Number(readArg('--duration-ms') ?? 30_000);
const intervalMs = Number(readArg('--interval-ms') ?? 1_000);
const rawUrl = process.env.DATABASE_URL?.trim() || process.env.IRON_SPRUE_ADMIN_DATABASE_URL?.trim();

if (!rawUrl) {
  throw new Error('DATABASE_URL or IRON_SPRUE_ADMIN_DATABASE_URL is required for DB sampling.');
}

const environment = process.env.RAILWAY_ENVIRONMENT_NAME?.trim() || process.env.IRON_SPRUE_ADMIN_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'unknown';
if (!/production/i.test(environment)) {
  throw new Error(`Refusing DB sampling outside the Railway production environment marker. Current marker: ${environment}`);
}

const target = safeTarget(rawUrl);
const startedAt = new Date();
const samples = [];
const client = new Client({ connectionString: rawUrl, application_name: 'iron-sprue-prelaunch-db-sampler' });
let connectionError = null;

client.on('error', (error) => {
  connectionError = {
    code: error.code ?? null,
    message: error.message ?? String(error),
  };
});

try {
  await client.connect();
  const deadline = Date.now() + durationMs;
  while (Date.now() <= deadline) {
    if (connectionError) break;
    try {
      samples.push(await sample(client));
    } catch (error) {
      connectionError = {
        code: error.code ?? null,
        message: error.message ?? String(error),
      };
      break;
    }
    await wait(intervalMs);
  }
} finally {
  await client.end().catch(() => undefined);
}

const endedAt = new Date();
const peakTotal = Math.max(...samples.map((entry) => entry.totalConnections), 0);
const peakActive = Math.max(...samples.map((entry) => entry.activeConnections), 0);
const peakIdle = Math.max(...samples.map((entry) => entry.idleConnections), 0);
const peakIdleTx = Math.max(...samples.map((entry) => entry.idleInTransactionConnections), 0);

console.log(JSON.stringify({
  startedAt: startedAt.toISOString(),
  endedAt: endedAt.toISOString(),
  target,
  sampleCount: samples.length,
  peaks: {
    totalConnections: peakTotal,
    activeConnections: peakActive,
    idleConnections: peakIdle,
    idleInTransactionConnections: peakIdleTx,
  },
  final: samples.at(-1) ?? null,
  connectionError,
  samples,
}, null, 2));

async function sample(db) {
  const result = await db.query(`
    select
      count(*)::int as total_connections,
      count(*) filter (where state = 'active')::int as active_connections,
      count(*) filter (where state = 'idle')::int as idle_connections,
      count(*) filter (where state = 'idle in transaction')::int as idle_in_transaction_connections,
      count(*) filter (where wait_event is not null)::int as waiting_connections
    from pg_stat_activity
    where datname = current_database()
  `);
  const appResult = await db.query(`
    select
      coalesce(application_name, '') as application_name,
      coalesce(state, '') as state,
      count(*)::int as count
    from pg_stat_activity
    where datname = current_database()
    group by application_name, state
    order by count desc, application_name asc
    limit 12
  `);
  const row = result.rows[0] ?? {};
  return {
    at: new Date().toISOString(),
    totalConnections: Number(row.total_connections ?? 0),
    activeConnections: Number(row.active_connections ?? 0),
    idleConnections: Number(row.idle_connections ?? 0),
    idleInTransactionConnections: Number(row.idle_in_transaction_connections ?? 0),
    waitingConnections: Number(row.waiting_connections ?? 0),
    byApplication: appResult.rows.map((entry) => ({
      applicationName: entry.application_name || '(none)',
      state: entry.state || '(none)',
      count: Number(entry.count ?? 0),
    })),
  };
}

function readArg(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeTarget(connectionString) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || null,
    database: url.pathname.replace(/^\/+/, '') || 'unknown',
    environment,
  };
}
