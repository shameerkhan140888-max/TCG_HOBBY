import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(appRoot, 'public-coming-soon');
const outputDir = join(appRoot, 'dist', 'public-coming-soon');
const logoSource = join(appRoot, 'public', 'brand', 'iron-sprue-horizontal.svg');
const logoOutput = join(outputDir, 'assets', 'iron-sprue-horizontal.svg');

await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, 'assets'), { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });
await cp(logoSource, logoOutput);

console.log(`Iron Sprue public coming soon page built at ${outputDir}`);
