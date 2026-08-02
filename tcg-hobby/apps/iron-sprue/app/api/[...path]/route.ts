import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { copyProxyRequestHeaders, getNodeApiOrigin, isAllowedProxyRoute, requireInternalSigningConfig, signInternalRequest } from '../../../lib/node-proxy';

const MAX_BODY_BYTES = 64 * 1024;

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathname = `/api/${path.join('/')}`;

  if (!isAllowedProxyRoute(request.method, pathname)) {
    return NextResponse.json({ error: 'Route not available.' }, { status: 404 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Request body too large.' }, { status: 413 });
  }

  let signingConfig: ReturnType<typeof requireInternalSigningConfig>;
  try {
    signingConfig = requireInternalSigningConfig();
  } catch {
    return NextResponse.json({ error: 'Mutation proxy is not configured.' }, { status: 503 });
  }

  const body = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  const timestamp = new Date().toISOString();
  const nonce = randomUUID();
  const headers = copyProxyRequestHeaders(request.headers);
  headers.set('x-iron-sprue-internal-timestamp', timestamp);
  headers.set('x-iron-sprue-internal-nonce', nonce);
  headers.set('x-iron-sprue-internal-key-id', signingConfig.keyId);
  headers.set('x-iron-sprue-internal-store', signingConfig.store);
  headers.set('x-iron-sprue-internal-environment', signingConfig.environment);
  headers.set('x-iron-sprue-internal-signature', await signInternalRequest({
    method: request.method,
    pathname,
    query: request.nextUrl.search,
    timestamp,
    nonce,
    body,
    ...signingConfig,
  }));
  headers.set('x-iron-sprue-store', signingConfig.store);

  const upstreamUrl = new URL(pathname + request.nextUrl.search, getNodeApiOrigin());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const init: RequestInit = {
      method: request.method,
      headers,
      signal: controller.signal,
      redirect: 'manual',
    };
    if (body) init.body = body;

    const upstream = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Commerce service is temporarily unavailable.' }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
