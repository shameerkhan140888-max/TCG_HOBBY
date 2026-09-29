import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const headersFile = readFileSync(join(__dirname, 'public', '_headers'), 'utf8');

describe('Iron Sprue static asset cache headers', () => {
  it('sets the Cloudflare/OpenNext static asset policy in public/_headers', () => {
    expect(headersFile).toContain('/_next/static/*\n  Cache-Control: public, max-age=31536000, immutable');
    expect(headersFile).toContain('/assets/*\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
    expect(headersFile).toContain('/brand/*\n  Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
  });
});
