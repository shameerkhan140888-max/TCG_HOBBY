import type { Prisma } from '@prisma/client';
import { prisma } from './client';

type RecoveryDatabase = {
  $transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
};

export async function consumePasswordResetToken(
  input: { tokenId: string; userId: string; passwordHash: string; verifiedAt: Date },
  db: RecoveryDatabase = prisma,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const claimed = await tx.userSecurityToken.updateMany({
      where: { id: input.tokenId, usedAt: null, expiresAt: { gt: input.verifiedAt } },
      data: { usedAt: input.verifiedAt },
    });
    if (claimed.count !== 1) return false;

    await tx.user.update({
      where: { id: input.userId },
      data: { passwordHash: input.passwordHash, emailVerified: input.verifiedAt },
    });
    await tx.session.deleteMany({ where: { userId: input.userId } });
    return true;
  });
}
