import { describe, expect, it, vi } from 'vitest';
import { consumePasswordResetToken } from './account-recovery';

function database(claimed: number) {
  const tx = {
    userSecurityToken: { updateMany: vi.fn(async () => ({ count: claimed })) },
    user: { update: vi.fn(async () => ({})) },
    session: { deleteMany: vi.fn(async () => ({ count: 1 })) },
  };
  return { tx, db: { $transaction: async (callback: (value: any) => Promise<any>) => callback(tx) } };
}

describe('password reset consumption', () => {
  it('claims the token before changing the password and invalidates sessions', async () => {
    const { tx, db } = database(1);
    const changed = await consumePasswordResetToken(
      { tokenId: 'token-1', userId: 'user-1', passwordHash: 'hash', verifiedAt: new Date('2026-07-22T00:00:00Z') },
      db as any,
    );
    expect(changed).toBe(true);
    expect(tx.user.update).toHaveBeenCalledOnce();
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
  });

  it('does not change credentials when another request has consumed the token', async () => {
    const { tx, db } = database(0);
    await expect(consumePasswordResetToken(
      { tokenId: 'token-1', userId: 'user-1', passwordHash: 'hash', verifiedAt: new Date('2026-07-22T00:00:00Z') },
      db as any,
    )).resolves.toBe(false);
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
});
