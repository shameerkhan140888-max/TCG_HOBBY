import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../dist/public-coming-soon/', import.meta.url);
const requiredFiles = [
  'index.html',
  '404.html',
  'privacy.html',
  'cookies.html',
  'contact.html',
  'robots.txt',
  'sitemap.xml',
  '_headers',
  '_redirects',
  'assets/iron-sprue-horizontal.svg',
  'assets/brands/aoshima.webp',
  'assets/brands/cubicfun.webp',
  'assets/brands/deluxe-materials.svg',
  'assets/brands/expo-tools.svg',
  'assets/brands/occre-creations.svg',
  'assets/brands/pintoo.webp',
  'assets/products/aoshima-lamborghini-adventador-green.jpg',
  'assets/products/aoshima-skyline-gtr-red-pearl.jpg',
  'assets/products/aoshima-toyota-gr86-spark-red.jpg',
  'assets/products/cubicfun-burj-al-arab.jpg',
  'assets/products/pintoo-koi-carp-lotus-vase.jpg',
];
const forbiddenPatterns = [
  /href=["']\/(?:shop|products|catalogue|account|cart|checkout|api|admin)\b/i,
  /\b(?:Stripe|Prisma|DATABASE_URL|STRIPE_SECRET|STRIPE_WEBHOOK|NEXTAUTH|AUTH_SECRET|IRON_SPRUE_RESEND_API_KEY)\b/,
  /localhost|127\.0\.0\.1/i,
];

async function readOutput(relativePath) {
  return readFile(new URL(relativePath, root), 'utf8');
}

async function listFiles(dirUrl = root, prefix = '') {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    const childUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl);
    if (entry.isDirectory()) {
      files.push(...await listFiles(childUrl, `${relative}/`));
    } else {
      files.push(relative);
    }
  }
  return files;
}

for (const file of requiredFiles) {
  await stat(new URL(file, root));
}

const files = await listFiles();
for (const file of files) {
  if (!/\.(?:html|css|js|txt|xml|svg|json)$/.test(file) && !file.startsWith('_')) continue;
  const content = await readOutput(file);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new Error(`Forbidden public landing content matched ${pattern} in ${file}`);
    }
  }
}

const index = await readOutput('index.html');
const contact = await readOutput('contact.html');
const logo = await readOutput('assets/iron-sprue-horizontal.svg');
const checks = [
  ['canonical www URL', /<link rel="canonical" href="https:\/\/www\.ironsprue\.co\.uk\/">/],
  ['mailing-list form', /<form[^>]+id="launch-list-form"/],
  ['server-side signup action', /action="\/api\/launch-list"/],
  ['accessible email label', /<label for="launch-email">Email address<\/label>/],
  ['explicit consent checkbox', /<input[^>]+id="launch-consent"[^>]+type="checkbox"[^>]+required/],
  ['Instagram handle', /@iron\.sprue/],
  ['Capital Hobby Group attribution', /trading division of Capital Hobby Group Ltd/],
  ['robots metadata allows indexing', /<meta name="robots" content="index, follow">/],
  ['structured data', /application\/ld\+json/],
  ['payment trust banner', /Safe\. Secure\. Trusted\./],
  ['static brand strip', /Brands planned for launch/],
  ['Pintoo launch product', /Koi Carp and Lotus Vase/],
];

for (const [label, pattern] of checks) {
if (!pattern.test(index)) throw new Error(`Missing ${label}`);
}

if (!/info@ironsprue\.co\.uk/.test(contact)) {
  throw new Error('Missing public contact email on contact page');
}

if (/fill:#151515/.test(logo) || /<polygon[^>]+points="8015\.43,7005\.8 8015\.43,3994\.2 484\.57,3994\.2 484\.57,7005\.8 "/.test(logo)) {
  throw new Error('Iron Sprue logo must not include a baked-in dark background panel.');
}

const script = await readOutput('signup.js');
const headers = await readOutput('_headers');
const formMarkup = index.match(/<form[^>]+id="launch-list-form"[\s\S]*?<\/form>/i)?.[0] ?? '';
if (/mailto:|localStorage/i.test(script) || /mailto:/i.test(formMarkup)) {
  throw new Error('Launch-list signup must not use mailto or localStorage.');
}
if (!/fetch\('\/api\/launch-list'/.test(script)) {
  throw new Error('Launch-list script must submit to the Pages Function endpoint.');
}
if (!/connect-src 'self'/.test(headers) || !/form-action 'self'/.test(headers)) {
  throw new Error('Headers must allow same-origin signup and same-origin form posts.');
}

console.log(`Validated ${files.length} static Iron Sprue coming-soon files.`);
