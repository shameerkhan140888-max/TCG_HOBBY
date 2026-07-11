import { prisma } from './client';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type LaunchSignupInput = {
  email: string;
  source?: string;
};

export type LaunchSignupResult = {
  email: string;
  created: boolean;
};

function normalizeLaunchEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateLaunchSignupEmail(email: string) {
  const normalized = normalizeLaunchEmail(email);

  if (!normalized) {
    return { ok: false as const, email: normalized, error: 'Enter your email address.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false as const, email: normalized, error: 'Enter a valid email address.' };
  }

  return { ok: true as const, email: normalized };
}

export async function upsertLaunchSignup(input: LaunchSignupInput, db = prisma): Promise<LaunchSignupResult> {
  const result = validateLaunchSignupEmail(input.email);

  if (!result.ok) {
    throw new Error(result.error);
  }

  const source = input.source?.trim().slice(0, 120) || 'storefront';
  try {
    const existing = await db.launchSignup.findUnique({
      where: { email: result.email },
      select: { id: true },
    });

    await db.launchSignup.upsert({
      where: { email: result.email },
      create: {
        email: result.email,
        source,
      },
      update: {
        source,
      },
    });

    return {
      email: result.email,
      created: !existing,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }

    return upsertDevelopmentLaunchSignup({
      email: result.email,
      source,
    });
  }
}

async function upsertDevelopmentLaunchSignup(input: Required<LaunchSignupInput>): Promise<LaunchSignupResult> {
  const filePath = join(process.cwd(), '.next', 'launch-signups.json');
  await mkdir(dirname(filePath), { recursive: true });

  let existingSignups: Array<Required<LaunchSignupInput> & { updatedAt: string }> = [];
  try {
    existingSignups = JSON.parse(await readFile(filePath, 'utf8')) as Array<Required<LaunchSignupInput> & { updatedAt: string }>;
  } catch {
    existingSignups = [];
  }

  const existingIndex = existingSignups.findIndex((signup) => signup.email === input.email);
  const nextSignup = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    existingSignups[existingIndex] = nextSignup;
  } else {
    existingSignups.push(nextSignup);
  }

  await writeFile(filePath, JSON.stringify(existingSignups, null, 2));

  return {
    email: input.email,
    created: existingIndex === -1,
  };
}
