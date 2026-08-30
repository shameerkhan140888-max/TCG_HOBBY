#!/usr/bin/env node

const DEFAULT_STOREFRONT_URL = 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev';
const DEFAULT_API_URL = 'https://considerate-unity-production-b734.up.railway.app';
const DEFAULT_MEDIA_URL = 'https://media.ironsprue.co.uk';

const args = new Set(process.argv.slice(2));
const profile = readArg('--profile') || 'baseline';
const storefrontUrl = cleanBaseUrl(process.env.IRON_SPRUE_LOAD_STOREFRONT_URL || DEFAULT_STOREFRONT_URL);
const apiUrl = cleanBaseUrl(process.env.IRON_SPRUE_LOAD_API_URL || DEFAULT_API_URL);
const mediaUrl = cleanBaseUrl(process.env.IRON_SPRUE_LOAD_MEDIA_URL || DEFAULT_MEDIA_URL);
const adminUrl = process.env.IRON_SPRUE_LOAD_ADMIN_URL ? cleanBaseUrl(process.env.IRON_SPRUE_LOAD_ADMIN_URL) : null;
const includeStateful = args.has('--include-stateful');
const statefulAllowed = process.env.IRON_SPRUE_LOAD_ALLOW_STATEFUL === '1';

if (includeStateful && !statefulAllowed) {
  throw new Error('Refusing stateful load. Set IRON_SPRUE_LOAD_ALLOW_STATEFUL=1 and keep concurrency low.');
}

const profiles = {
  baseline: { iterations: 1, concurrency: 1, mobile: false },
  'mobile-baseline': { iterations: 1, concurrency: 1, mobile: true },
  'storefront-low': { iterations: 5, concurrency: 2, mobile: false },
  'storefront-mobile-low': { iterations: 5, concurrency: 2, mobile: true },
  'storefront-moderate': { iterations: 10, concurrency: 5, mobile: false },
  'media-reload': { iterations: 8, concurrency: 4, mobile: true },
};

const selected = profiles[profile];
if (!selected) {
  throw new Error(`Unknown profile "${profile}". Use one of: ${Object.keys(profiles).join(', ')}`);
}

const routes = [
  { name: 'storefront.home', url: `${storefrontUrl}/` },
  { name: 'storefront.shop', url: `${storefrontUrl}/shop` },
  { name: 'storefront.category.model-kits', url: `${storefrontUrl}/shop/model-kits` },
  { name: 'storefront.pdp.aoshima', url: `${storefrontUrl}/products/aoshima-06347-lamborghini-aventador-red` },
  { name: 'storefront.pdp.multi-media', url: `${storefrontUrl}/products/pintoo-q1035-jigsaw-vase-peaceful-koi` },
  { name: 'api.health', url: `${apiUrl}/v1/health` },
  { name: 'api.home', url: `${apiUrl}/v1/home` },
  { name: 'api.catalogue', url: `${apiUrl}/v1/catalogue?pageSize=24` },
  { name: 'api.pdp.aoshima', url: `${apiUrl}/v1/catalogue/aoshima-06347-lamborghini-aventador-red` },
];

if (adminUrl) {
  routes.push({ name: 'admin.login', url: `${adminUrl}/iron-sprue-admin/login` });
}

const discoveredMedia = await discoverMediaUrls();
for (const [index, url] of discoveredMedia.entries()) {
  routes.push({ name: `media.product.${index + 1}`, url });
}

const work = [];
for (let i = 0; i < selected.iterations; i += 1) {
  for (const route of routes) work.push({ ...route, iteration: i + 1 });
}

const startedAt = new Date();
const results = await runPool(work, selected.concurrency, (item) => timeRequest(item, selected.mobile));
const endedAt = new Date();
const grouped = groupBy(results, (result) => result.name);

const summary = [...grouped.entries()].map(([name, entries]) => {
  const durations = entries.map((entry) => entry.durationMs).sort((a, b) => a - b);
  const errors = entries.filter((entry) => entry.error || entry.status >= 400 || entry.status === 0);
  const statuses = [...new Set(entries.map((entry) => entry.status || 'ERR'))].join(',');
  return {
    name,
    count: entries.length,
    statuses,
    errors: errors.length,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    maxMs: Math.max(...durations),
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
  };
});

console.log(JSON.stringify({
  profile,
  startedAt: startedAt.toISOString(),
  endedAt: endedAt.toISOString(),
  safety: {
    statefulIncluded: includeStateful,
    statefulAllowed,
    stripeSessionCreation: false,
    destructiveAdminActions: false,
  },
  targets: {
    storefrontUrl,
    apiUrl,
    mediaUrl,
    adminUrl,
  },
  concurrency: selected.concurrency,
  iterations: selected.iterations,
  summary,
  errors: results.filter((result) => result.error || result.status >= 400 || result.status === 0),
}, null, 2));

function readArg(name) {
  const prefix = `${name}=`;
  const value = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function cleanBaseUrl(raw) {
  return raw.trim().replace(/\/+$/, '');
}

async function discoverMediaUrls() {
  try {
    const response = await fetch(`${apiUrl}/v1/catalogue/aoshima-06347-lamborghini-aventador-red`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return [];
    const product = await response.json();
    return (product.images || [])
      .map((image) => image?.url)
      .filter((url) => typeof url === 'string' && url.startsWith('/media/iron-sprue/'))
      .slice(0, 3)
      .map((url) => `${storefrontUrl}${url}`);
  } catch {
    return [];
  }
}

async function runPool(items, concurrency, worker) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      results.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return results;
}

async function timeRequest(item, mobile) {
  const started = performance.now();
  try {
    const response = await fetch(item.url, {
      headers: {
        'user-agent': mobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
          : 'IronSpruePrelaunchLoadCheck/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const buffer = await response.arrayBuffer();
    return {
      name: item.name,
      iteration: item.iteration,
      url: item.url,
      status: response.status,
      finalUrl: response.url,
      durationMs: round(performance.now() - started),
      bytes: buffer.byteLength,
      cfRay: response.headers.get('cf-ray'),
      cacheStatus: response.headers.get('cf-cache-status') || response.headers.get('x-vercel-cache') || null,
    };
  } catch (error) {
    return {
      name: item.name,
      iteration: item.iteration,
      url: item.url,
      status: 0,
      finalUrl: item.url,
      durationMs: round(performance.now() - started),
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    groups.set(key, [...(groups.get(key) || []), value]);
  }
  return groups;
}

function percentile(sorted, target) {
  if (!sorted.length) return 0;
  const index = Math.ceil((target / 100) * sorted.length) - 1;
  return round(sorted[Math.max(0, Math.min(index, sorted.length - 1))]);
}

function round(value) {
  return Math.round(value * 100) / 100;
}
