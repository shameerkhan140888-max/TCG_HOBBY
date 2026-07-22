import { prisma } from '@tcg-hobby/database';
import { E2E_STAFF_EMAIL } from './global-setup';
export default async function teardown() {
  if (process.env.TCG_HOBBY_E2E_FIXTURE_CREATED !== '1') return;
  if (
    process.env.TCG_HOBBY_E2E_ADMIN_FIXTURE !== '1' ||
    process.env.NODE_ENV === 'production' ||
    !process.env.E2E_DATABASE_URL ||
    process.env.E2E_DATABASE_URL !== process.env.DATABASE_URL
  )
    throw new Error('Refusing unsafe E2E fixture cleanup.');
  await prisma.user.deleteMany({
    where: { email: E2E_STAFF_EMAIL, role: 'STAFF' },
  });
}
