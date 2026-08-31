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
const adminCookie = process.env.IRON_SPRUE_LOAD_ADMIN_COOKIE?.trim() || '';
const includeStateful = args.has('--include-stateful');
const statefulAllowed = process.env.IRON_SPRUE_LOAD_ALLOW_STATEFUL === '1';

if ((includeStateful || profile.includes('checkout')) && !statefulAllowed) {
  throw new Error('Refusing stateful load. Set IRON_SPRUE_LOAD_ALLOW_STATEFUL=1 and keep concurrency low.');
}

const profiles = {
  baseline: { iterations: 1, concurrency: 1, mobile: false },
  'mobile-baseline': { iterations: 1, concurrency: 1, mobile: true },
  'storefront-low': { iterations: 5, concurrency: 2, mobile: false },
  'storefront-mobile-low': { iterations: 5, concurrency: 2, mobile: true },
  'storefront-moderate': { iterations: 10, concurrency: 5, mobile: false },
  'storefront-high': { iterations: 12, concurrency: 10, mobile: false },
  'storefront-stress': { iterations: 15, concurrency: 20, mobile: false },
  'media-only': { iterations: 12, concurrency: 4, mobile: true, mediaOnly: true },
  'media-reload': { iterations: 8, concurrency: 4, mobile: true },
  'commerce-readiness': { iterations: 5, concurrency: 2, mobile: true, commerce: true },
  'admin-auth-low': { iterations: 4, concurrency: 2, mobile: false, adminAuth: true, storefront: false },
  'combined-auth-low': { iterations: 5, concurrency: 3, mobile: false, adminAuth: true },
  'checkout-start-capped': { iterations: 2, concurrency: 1, mobile: true, commerce: true, checkoutStart: true },
};

const selected = profiles[profile];
if (!selected) {
  throw new Error(`Unknown profile "${profile}". Use one of: ${Object.keys(profiles).join(', ')}`);
}

const routes = selected.storefront === false ? [] : [
  { name: 'storefront.home', url: `${storefrontUrl}/` },
  { name: 'storefront.shop', url: `${storefrontUrl}/shop` },
  { name: 'storefront.category.model-kits', url: `${storefrontUrl}/shop/model-kits` },
  { name: 'storefront.pdp.aoshima', url: `${storefrontUrl}/products/aoshima-06347-lamborghini-aventador-red` },
  { name: 'storefront.pdp.multi-media', url: `${storefrontUrl}/products/pintoo-q1035-jigsaw-vase-peaceful-koi` },
  { name: 'storefront.basket', url: `${storefrontUrl}/basket` },
  { name: 'storefront.checkout', url: `${storefrontUrl}/checkout` },
  { name: 'api.health', url: `${apiUrl}/v1/health` },
  { name: 'api.home', url: `${apiUrl}/v1/home` },
  { name: 'api.catalogue', url: `${apiUrl}/v1/catalogue?pageSize=24` },
  { name: 'api.pdp.aoshima', url: `${apiUrl}/v1/catalogue/aoshima-06347-lamborghini-aventador-red` },
];

if (adminUrl) {
  routes.push({ name: 'admin.login', url: `${adminUrl}/iron-sprue-admin/login` });
}
if (selected.adminAuth) {
  if (!adminUrl) throw new Error('Authenticated admin profiles require IRON_SPRUE_LOAD_ADMIN_URL.');
  if (!adminCookie) throw new Error('Authenticated admin profiles require IRON_SPRUE_LOAD_ADMIN_COOKIE.');
  routes.push(
    { name: 'admin.dashboard.auth', url: `${adminUrl}/iron-sprue-admin`, headers: { cookie: adminCookie } },
    { name: 'admin.products.auth', url: `${adminUrl}/iron-sprue-admin/products`, headers: { cookie: adminCookie } },
    { name: 'admin.products.search.auth', url: `${adminUrl}/iron-sprue-admin/products?q=Aoshima`, headers: { cookie: adminCookie } },
    { name: 'admin.media.auth', url: `${adminUrl}/iron-sprue-admin/media`, headers: { cookie: adminCookie } },
    { name: 'admin.content.auth', url: `${adminUrl}/iron-sprue-admin/content-review`, headers: { cookie: adminCookie } },
    { name: 'admin.orders.auth', url: `${adminUrl}/iron-sprue-admin/orders`, headers: { cookie: adminCookie } },
  );
}

const productProbe = await discoverProductProbe();
if (selected.mediaOnly) {
  routes.length = 0;
}
for (const [index, url] of productProbe.mediaUrls.entries()) {
  routes.push({ name: `media.product.${index + 1}`, url });
}
if (selected.commerce && productProbe.productId) {
  routes.push({
    name: 'api.basket.resolve.guest',
    url: `${apiUrl}/v1/basket/resolve`,
    method: 'POST',
    body: {
      items: [
        {
          productId: productProbe.productId,
          quantity: 1,
        },
      ],
    },
  });
  routes.push({
    name: 'storefront.cart.resolve.guest',
    url: `${storefrontUrl}/api/cart/resolve`,
    method: 'POST',
    body: {
      items: [
        {
          productId: productProbe.productId,
          quantity: 1,
        },
      ],
    },
  });
}
if (selected.checkoutStart && productProbe.checkoutProductId) {
  routes.push({
    name: 'storefront.checkout.payment-intent.start',
    url: `${storefrontUrl}/api/checkout/payment-intent`,
    method: 'POST',
    body: {
      guestItems: [{ productId: productProbe.checkoutProductId, quantity: 1 }],
      shippingAddress: testAddress(),
      shippingMethodCode: 'UK_STANDARD',
      checkoutAttemptIdPrefix: `prelaunch-load-${Date.now()}`,
    },
    after: cancelPaymentIntent,
  });
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
    p99Ms: percentile(durations, 99),
    maxMs: Math.max(...durations),
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    after: summarizeAfter(entries),
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
    paymentIntentCreation: Boolean(selected.checkoutStart),
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

async function discoverProductProbe() {
  try {
    const [response, catalogueResponse] = await Promise.all([
      fetch(`${apiUrl}/v1/catalogue/aoshima-06347-lamborghini-aventador-red`, { signal: AbortSignal.timeout(10_000) }),
      fetch(`${apiUrl}/v1/catalogue?pageSize=24`, { signal: AbortSignal.timeout(10_000) }),
    ]);
    if (!response.ok) return { productId: null, checkoutProductId: null, mediaUrls: [] };
    const product = await response.json();
    const catalogue = catalogueResponse.ok ? await catalogueResponse.json() : null;
    const checkoutCandidate = catalogue?.products?.find((item) => (
      item?.purchasable
      && item?.stockState === 'IN_STOCK'
      && Number(item?.availableQuantity ?? 0) >= 3
    )) ?? catalogue?.products?.find((item) => item?.purchasable && Number(item?.availableQuantity ?? 0) >= 1);
    const mediaUrls = (product.images || [])
      .map((image) => image?.url)
      .filter((url) => typeof url === 'string' && url.startsWith('/media/iron-sprue/'))
      .slice(0, 3)
      .map((url) => displayMediaUrl(`${storefrontUrl}${url}`, selected.mobile ? 480 : 960));
    return {
      productId: typeof product.id === 'string' ? product.id : null,
      checkoutProductId: typeof checkoutCandidate?.id === 'string' ? checkoutCandidate.id : null,
      mediaUrls,
    };
  } catch {
    return { productId: null, checkoutProductId: null, mediaUrls: [] };
  }
}

function displayMediaUrl(value, width) {
  const url = new URL(value);
  url.searchParams.set('w', String(width));
  return url.toString();
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
    const requestBody = requestBodyFor(item);
    const response = await fetch(item.url, {
      method: item.method ?? 'GET',
      headers: {
        'user-agent': mobile
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
          : 'IronSpruePrelaunchLoadCheck/1.0',
        ...(requestBody ? { 'content-type': 'application/json' } : {}),
        ...(item.headers ?? {}),
      },
      ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const buffer = await response.arrayBuffer();
    let afterResult = null;
    if (item.after && response.ok) {
      afterResult = await item.after(buffer, mobile).catch((error) => ({
        error: error instanceof Error ? error.message : String(error),
      }));
    }
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
      after: afterResult,
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

function requestBodyFor(item) {
  if (!item.body) return null;
  if (!item.body.checkoutAttemptIdPrefix) return item.body;
  const { checkoutAttemptIdPrefix, ...body } = item.body;
  return {
    ...body,
    checkoutAttemptId: `${checkoutAttemptIdPrefix}-${item.iteration}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

async function cancelPaymentIntent(buffer, mobile) {
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    return { cancelled: false, reason: 'non-json-response' };
  }
  if (!payload?.paymentIntentId) return { cancelled: false, reason: 'missing-payment-intent-id' };
  const response = await fetch(`${storefrontUrl}/api/checkout/payment-intent/cancel`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': mobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
        : 'IronSpruePrelaunchLoadCheck/1.0',
    },
    body: JSON.stringify({ paymentIntentId: payload.paymentIntentId }),
    signal: AbortSignal.timeout(20_000),
  });
  await response.arrayBuffer();
  return { cancelled: response.ok, status: response.status };
}

function testAddress() {
  return {
    fullName: 'Iron Sprue Load Test',
    email: 'load-test+iron-sprue@example.invalid',
    line1: '1 Test Street',
    line2: '',
    city: 'London',
    region: '',
    postalCode: 'SW1A 1AA',
    country: 'GB',
  };
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    groups.set(key, [...(groups.get(key) || []), value]);
  }
  return groups;
}

function summarizeAfter(entries) {
  const values = entries.map((entry) => entry.after).filter(Boolean);
  if (!values.length) return null;
  return {
    count: values.length,
    cancelled: values.filter((value) => value.cancelled === true).length,
    failures: values.filter((value) => value.cancelled !== true),
  };
}

function percentile(sorted, target) {
  if (!sorted.length) return 0;
  const index = Math.ceil((target / 100) * sorted.length) - 1;
  return round(sorted[Math.max(0, Math.min(index, sorted.length - 1))]);
}

function round(value) {
  return Math.round(value * 100) / 100;
}
