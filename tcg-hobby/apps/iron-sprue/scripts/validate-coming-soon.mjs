import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../dist/public-coming-soon/', import.meta.url);
const requiredFiles = [
  'index.html',
  '404.html',
  'privacy.html',
  'cookies.html',
  'robots.txt',
  'sitemap.xml',
  '_headers',
  '_redirects',
  'assets/iron-sprue-horizontal.svg',
  'assets/brands/aoshima.svg',
  'assets/brands/deluxe-materials.svg',
  'assets/brands/expo-tools.svg',
  'assets/brands/occre-creations.svg',
  'assets/brands/pintoo.svg',
  'assets/products/aoshima-kit.svg',
  'assets/products/pintoo-display-build.svg',
  'assets/products/workshop-essentials.svg',
];
const forbiddenPatterns = [
  /href=["']\/(?:shop|products|catalogue|account|cart|checkout|api|admin)\b/i,
  /\b(?:Stripe|Prisma|DATABASE_URL|STRIPE_SECRET|STRIPE_WEBHOOK|Resend|NEXTAUTH|AUTH_SECRET)\b/,
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
const checks = [
  ['canonical www URL', /<link rel="canonical" href="https:\/\/www\.ironsprue\.co\.uk\/">/],
  ['mailing-list form', /<form[^>]+id="launch-list-form"/],
  ['accessible email label', /<label for="launch-email">Email address<\/label>/],
  ['public contact email', /info@ironsprue\.co\.uk/],
  ['Instagram handle', /@iron\.sprue/],
  ['Capital Hobby Group attribution', /trading division of Capital Hobby Group Ltd/],
  ['robots metadata allows indexing', /<meta name="robots" content="index, follow">/],
  ['structured data', /application\/ld\+json/],
  ['brand carousel', /data-carousel/],
];

for (const [label, pattern] of checks) {
  if (!pattern.test(index)) throw new Error(`Missing ${label}`);
}

console.log(`Validated ${files.length} static Iron Sprue coming-soon files.`);
