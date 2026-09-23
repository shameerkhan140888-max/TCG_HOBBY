import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_LOGIN_PATH,
  IRON_SPRUE_CANONICAL_HOST,
  isAccessExemptPath,
  isCanonicalStorefrontHost,
  isRedirectStorefrontHost,
  noindexHeaders,
  shouldNoindexStorefrontHost,
  storefrontAccessMode,
  verifyAccessCookieValue,
} from './lib/staging-access';

export async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (isRedirectStorefrontHost(hostname) || (isCanonicalStorefrontHost(hostname) && request.nextUrl.protocol !== 'https:')) {
    const url = request.nextUrl.clone();
    url.hostname = IRON_SPRUE_CANONICAL_HOST;
    url.protocol = 'https';
    return NextResponse.redirect(url, 301);
  }

  const mode = storefrontAccessMode();
  const responseHeaders = shouldNoindexStorefrontHost(hostname) ? noindexHeaders() : undefined;

  if (mode === 'public' || isAccessExemptPath(request.nextUrl.pathname)) {
    return responseHeaders ? NextResponse.next({ headers: responseHeaders }) : NextResponse.next();
  }

  const cookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (await verifyAccessCookieValue(cookie)) {
    return responseHeaders ? NextResponse.next({ headers: responseHeaders }) : NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = ACCESS_LOGIN_PATH;
  url.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return responseHeaders ? NextResponse.redirect(url, { headers: responseHeaders }) : NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
