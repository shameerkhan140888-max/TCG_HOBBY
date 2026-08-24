import { NextResponse, type NextRequest } from 'next/server';

function getWebhookApiOrigin() {
  const origin = process.env.IRON_SPRUE_PRODUCTION_API_BASE_URL?.trim() || process.env.IRON_SPRUE_NODE_API_ORIGIN?.trim();
  if (!origin) throw new Error('IRON_SPRUE_PRODUCTION_API_BASE_URL is required for webhook forwarding.');
  const url = new URL(origin);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('IRON_SPRUE_PRODUCTION_API_BASE_URL must use HTTPS in production.');
  }
  return url.origin;
}

export async function POST(request: NextRequest) {
  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL('/api/stripe/iron-sprue/webhook', getWebhookApiOrigin());
  } catch {
    return NextResponse.json({ error: 'Webhook forwarding is not configured.' }, { status: 503 });
  }

  const headers = new Headers();
  const signature = request.headers.get('stripe-signature');
  const contentType = request.headers.get('content-type');
  if (signature) headers.set('stripe-signature', signature);
  if (contentType) headers.set('content-type', contentType);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: await request.text(),
      redirect: 'manual',
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Webhook service is temporarily unavailable.' }, { status: 503 });
  }
}
