import { hashPassword } from '@tcg-hobby/auth';
import { prisma } from '@tcg-hobby/database';

export const E2E_STAFF_EMAIL = 'e2e-admin@tcghobby.invalid';
export const E2E_STAFF_PASSWORD = 'E2eAdminOnly123!';

function enabled() {
  return process.env.TCG_HOBBY_E2E_ADMIN_FIXTURE === '1';
}

function assertSafe() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('E2E Admin fixtures are disabled in production.');
  }

  const testUrl = process.env.E2E_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  if (!testUrl || !databaseUrl || testUrl !== databaseUrl) {
    throw new Error(
      'E2E Admin fixtures require DATABASE_URL to exactly match E2E_DATABASE_URL.',
    );
  }
}

export default async function setup() {
  if (!enabled()) return;
  assertSafe();

  await prisma.user.upsert({
    where: { email: E2E_STAFF_EMAIL },
    update: {
      passwordHash: hashPassword(E2E_STAFF_PASSWORD),
      role: 'STAFF',
      emailVerified: new Date(),
    },
    create: {
      email: E2E_STAFF_EMAIL,
      passwordHash: hashPassword(E2E_STAFF_PASSWORD),
      role: 'STAFF',
      emailVerified: new Date(),
      wishlist: { create: {} },
    },
  });
  process.env.TCG_HOBBY_E2E_FIXTURE_CREATED = '1';
}
