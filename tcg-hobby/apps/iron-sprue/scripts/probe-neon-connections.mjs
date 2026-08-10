import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

function parseEnvFile(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[name] = value;
  }
  return values;
}

const env = parseEnvFile(await readFile(path.join(appRoot, '.env.local'), 'utf8'));
const keys = ['IRON_SPRUE_DATABASE_URL', 'IRON_SPRUE_DIRECT_DATABASE_URL', 'IRON_SPRUE_WORKER_READ_DATABASE_URL'];
const report = [];

for (const key of keys) {
  const value = env[key]?.trim();
  if (!value) {
    report.push({ key, status: 'missing' });
    continue;
  }
  const url = new URL(value);
  const sql = neon(value);
  const rows = await sql.query('select count(*)::int as products from "IronSprueAdminProduct" where "storeCode" = $1', ['IRON_SPRUE']);
  report.push({
    key,
    host: url.hostname,
    database: url.pathname.replace(/^\//, ''),
    status: 'ok',
    products: rows[0].products,
  });
}

console.log(JSON.stringify(report, null, 2));
