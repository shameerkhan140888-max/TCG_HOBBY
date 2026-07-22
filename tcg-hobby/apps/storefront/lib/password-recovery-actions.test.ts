import { describe, expect, it } from 'vitest';
import { hashPasswordResetToken } from './password-recovery';
describe('password recovery token handling',()=>{it('hashes reset tokens deterministically without retaining the raw token',()=>{const raw='one-time-secret';const hash=hashPasswordResetToken(raw);expect(hash).toHaveLength(64);expect(hash).not.toContain(raw);expect(hashPasswordResetToken(raw)).toBe(hash);});});
