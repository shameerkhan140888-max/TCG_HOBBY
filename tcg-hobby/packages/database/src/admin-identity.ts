import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from './client';

export type PromoteUserInput = { email: string; role: Extract<UserRole, 'ADMIN' | 'STAFF'>; actorEmail?: string | null; source?: string };
type PromotionDatabase = { $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> };

export async function promoteExistingUser(input: PromoteUserInput, db: PromotionDatabase = prisma) {
  const email = input.email.trim().toLowerCase();
  const actorEmail = input.actorEmail?.trim().toLowerCase() || null;
  return db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerified: true, role: true } });
    if (!target) throw new Error(`No user exists for ${email}. Register and verify the account first.`);
    if (!target.emailVerified) throw new Error(`The account for ${email} has not verified ownership of its email address.`);
    const adminCount = await tx.user.count({ where: { role: 'ADMIN' } });
    const actor = actorEmail ? await tx.user.findUnique({ where: { email: actorEmail }, select: { id: true, role: true } }) : null;
    const bootstrap = input.role === 'ADMIN' && adminCount === 0;
    if (!bootstrap && actor?.role !== 'ADMIN') throw new Error('An existing ADMIN actor is required for this role change.');
    if (target.role === input.role) return { changed: false, userId: target.id, email: target.email, role: target.role };
    const updated = await tx.user.update({ where: { id: target.id }, data: { role: input.role }, select: { id: true, email: true, role: true } });
    await tx.adminRoleChange.create({ data: { userId: target.id, previousRole: target.role, newRole: input.role, changedByUserId: actor?.id ?? null, source: input.source ?? 'CLI_ADMIN_PROMOTE' } });
    return { changed: true, userId: updated.id, email: updated.email, role: updated.role };
  });
}
