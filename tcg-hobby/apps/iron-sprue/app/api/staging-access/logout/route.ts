import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE_NAME, ACCESS_LOGIN_PATH, noindexHeaders } from '../../../../lib/staging-access';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL(ACCESS_LOGIN_PATH, request.url), { headers: noindexHeaders() });
  response.cookies.set(ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
