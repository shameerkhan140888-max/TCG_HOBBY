'use server';

import { upsertMarketingSubscriberSignup, validateSubscriberEmail } from '@tcg-hobby/database';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sendSubscriberConfirmationEmail } from './marketing-email';
import { isSignupRateLimited } from './signup-rate-limit';

function getReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

function withSubscriberSignupParam(returnTo: string, value: 'saved' | 'invalid' | 'save' | 'limited') {
  const separator = returnTo.includes('?') ? '&' : '?';
  return `${returnTo}${separator}subscriberSignup=${value}#launch-list`;
}

async function getRequestIp() {
  const headerList = await headers();
  return (
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerList.get('x-real-ip') ??
    null
  );
}

export async function captureLaunchEmailAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const firstName = String(formData.get('firstName') ?? '');
  const source = String(formData.get('source') ?? 'coming-soon-page');
  const consent = formData.get('marketingConsent') === 'on';
  const honeypot = String(formData.get('company') ?? '');
  const returnTo = getReturnTo(formData.get('returnTo'));
  const result = validateSubscriberEmail(email);

  if (!result.ok) {
    redirect(withSubscriberSignupParam(returnTo, 'invalid'));
  }

  if (honeypot.trim()) {
    redirect(withSubscriberSignupParam(returnTo, 'saved'));
  }

  if (isSignupRateLimited(`${result.email}:${source}`)) {
    redirect(withSubscriberSignupParam(returnTo, 'limited'));
  }

  try {
    const signup = await upsertMarketingSubscriberSignup({
      email: result.email,
      firstName,
      marketingConsent: consent,
      source: source || 'coming-soon-page',
      consentSource: source || 'coming-soon-page',
      consentIp: await getRequestIp(),
    });

    if (signup.shouldSendConfirmation) {
      await sendSubscriberConfirmationEmail(signup);
    }
  } catch {
    redirect(withSubscriberSignupParam(returnTo, 'save'));
  }

  redirect(withSubscriberSignupParam(returnTo, 'saved'));
}
