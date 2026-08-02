import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  ACCESS_COOKIE_NAME,
  ACCESS_LOGIN_PATH,
  assertPasswordAttemptAllowed,
  createAccessCookieValue,
  noindexHeaders,
  verifyStagingPassword,
} from '../../../lib/staging-access';

function requestKey(request: NextRequest) {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

function safeReturnTo(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value : '/';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 2048) {
    return NextResponse.redirect(new URL(`${ACCESS_LOGIN_PATH}?error=invalid`, request.url), { headers: noindexHeaders() });
  }

  try {
    assertPasswordAttemptAllowed(requestKey(request));
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    const returnTo = safeReturnTo(form.get('returnTo'));

    if (!(await verifyStagingPassword(password))) {
      return NextResponse.redirect(new URL(`${ACCESS_LOGIN_PATH}?error=invalid&returnTo=${encodeURIComponent(returnTo)}`, request.url), { headers: noindexHeaders() });
    }

    const response = NextResponse.redirect(new URL(returnTo, request.url), { headers: noindexHeaders() });
    response.cookies.set(ACCESS_COOKIE_NAME, await createAccessCookieValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL(`${ACCESS_LOGIN_PATH}?error=invalid`, request.url), { headers: noindexHeaders() });
  }
}
