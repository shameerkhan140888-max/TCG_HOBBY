'use server';

import { upsertMarketingSubscriberSignup, validateSubscriberEmail } from '@tcg-hobby/database';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LAUNCH_MARKETING_CONSENT_VALUE } from './launch-consent';
import { sendSubscriberConfirmationEmail } from './marketing-email';
import { isSignupRateLimited } from './signup-rate-limit';

type RequestContext = {
  correlationId: string | null;
  ip: string | null;
};

type ErrorRecord = {
  name?: unknown;
  code?: unknown;
  clientVersion?: unknown;
  meta?: unknown;
};

function getReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

function withSubscriberSignupParam(returnTo: string, value: 'saved' | 'invalid' | 'save' | 'limited' | 'consent' | 'spam') {
  const separator = returnTo.includes('?') ? '&' : '?';
  return `${returnTo}${separator}subscriberSignup=${value}#join-launch-list`;
}

async function getRequestContext(): Promise<RequestContext> {
  const headerList = await headers();
  const correlationId =
    headerList.get('x-vercel-id') ??
    headerList.get('x-request-id') ??
    headerList.get('x-correlation-id') ??
    null;

  return {
    correlationId,
    ip:
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headerList.get('x-real-ip') ??
      null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorRecord(error: unknown): ErrorRecord {
  return isRecord(error) ? error : {};
}

function getErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name || error.constructor.name;
  }

  const record = getErrorRecord(error);
  return typeof record.name === 'string' ? record.name : typeof error;
}

function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getPrismaTarget(meta: unknown) {
  if (!isRecord(meta)) {
    return undefined;
  }

  const target = meta.target;
  if (Array.isArray(target)) {
    return target.filter((value): value is string => typeof value === 'string');
  }

  return getString(target);
}

function getPrismaModel(meta: unknown) {
  if (!isRecord(meta)) {
    return undefined;
  }

  return getString(meta.modelName) ?? getString(meta.model);
}

function getSafeDatabaseTarget() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    return {
      configured: false,
      provider: 'postgresql',
    };
  }

  try {
    const parsed = new URL(rawUrl);
    const hostnameParts = parsed.hostname.split('.').filter(Boolean);
    const hostnameSuffix = hostnameParts.length > 3 ? hostnameParts.slice(-4).join('.') : parsed.hostname;
    const regionMatch = parsed.hostname.match(/[a-z]{2}-[a-z]+-\d/);

    return {
      configured: true,
      provider: parsed.protocol.replace(':', ''),
      hostnameSuffix,
      database: parsed.pathname.replace(/^\//, '') || undefined,
      schema: parsed.searchParams.get('schema') ?? 'public',
      region: regionMatch?.[0],
    };
  } catch {
    return {
      configured: true,
      provider: 'postgresql',
      parseError: 'invalid_database_url',
    };
  }
}

function logLaunchSignupPersistenceFailure(error: unknown, requestContext: RequestContext) {
  const record = getErrorRecord(error);
  const prismaMeta = record.meta;

  console.error('launch_signup_persistence_failed', {
    event: 'launch_signup_persistence_failed',
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      nextRuntime: process.env.NEXT_RUNTIME,
    },
    request: {
      correlationId: requestContext.correlationId,
    },
    database: getSafeDatabaseTarget(),
    operation: {
      name: 'upsertMarketingSubscriberSignup',
      attempted: true,
      stage: 'before_persistence_confirmed',
      model: getPrismaModel(prismaMeta) ?? 'MarketingSubscriber',
    },
    error: {
      name: getErrorName(error),
      code: getString(record.code),
      clientVersion: getString(record.clientVersion),
      target: getPrismaTarget(prismaMeta),
    },
  });
}

export async function captureLaunchEmailAction(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const firstName = String(formData.get('firstName') ?? '');
  const source = String(formData.get('source') ?? 'coming-soon-page');
  const consent = formData.get('marketingConsent') === LAUNCH_MARKETING_CONSENT_VALUE;
  const honeypot = String(formData.get('company') ?? '');
  const returnTo = getReturnTo(formData.get('returnTo'));
  const result = validateSubscriberEmail(email);

  if (!result.ok) {
    redirect(withSubscriberSignupParam(returnTo, 'invalid'));
  }

  if (honeypot.trim()) {
    redirect(withSubscriberSignupParam(returnTo, 'spam'));
  }

  if (!consent) {
    redirect(withSubscriberSignupParam(returnTo, 'consent'));
  }

  if (isSignupRateLimited(`${result.email}:${source}`)) {
    redirect(withSubscriberSignupParam(returnTo, 'limited'));
  }

  const requestContext = await getRequestContext();
  let signup: Awaited<ReturnType<typeof upsertMarketingSubscriberSignup>>;

  try {
    signup = await upsertMarketingSubscriberSignup({
      email: result.email,
      firstName,
      marketingConsent: consent,
      source: source || 'coming-soon-page',
      consentSource: source || 'coming-soon-page',
      consentIp: requestContext.ip,
    });
  } catch (error) {
    logLaunchSignupPersistenceFailure(error, requestContext);
    redirect(withSubscriberSignupParam(returnTo, 'save'));
  }

  if (signup.shouldSendConfirmation) {
    try {
      await sendSubscriberConfirmationEmail(signup);
    } catch {
      console.error('Launch confirmation email failed after subscriber persistence.', {
        subscriberId: signup.subscriberId,
      });
    }
  }

  redirect(withSubscriberSignupParam(returnTo, 'saved'));
}
