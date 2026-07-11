'use server';

import { upsertLaunchSignup, validateLaunchSignupEmail } from '@tcg-hobby/database';
import { redirect } from 'next/navigation';

function getReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

function withLaunchSignupParam(returnTo: string, value: 'saved' | 'invalid' | 'save') {
  const separator = returnTo.includes('?') ? '&' : '?';
  return `${returnTo}${separator}launchSignup=${value}#launch-list`;
}

export async function captureLaunchEmailAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const source = String(formData.get('source') ?? 'storefront');
  const returnTo = getReturnTo(formData.get('returnTo'));
  const result = validateLaunchSignupEmail(email);

  if (!result.ok) {
    redirect(withLaunchSignupParam(returnTo, 'invalid'));
  }

  try {
    await upsertLaunchSignup({
      email: result.email,
      source,
    });
  } catch {
    redirect(withLaunchSignupParam(returnTo, 'save'));
  }

  redirect(withLaunchSignupParam(returnTo, 'saved'));
}
