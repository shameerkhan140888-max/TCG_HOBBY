import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE_NAME, ACCESS_LOGIN_PATH, isAccessExemptPath, noindexHeaders, storefrontAccessMode, verifyAccessCookieValue } from './lib/staging-access';

export async function middleware(request: NextRequest) {
  const mode = storefrontAccessMode();
  const responseHeaders = mode === 'protected' ? noindexHeaders() : undefined;

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
