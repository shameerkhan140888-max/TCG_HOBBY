import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes and verifies passwords securely', () => {
    const hash = hashPassword('SamCollector123!');

    expect(verifyPassword('SamCollector123!', hash)).toBe(true);
    expect(verifyPassword('WrongPassword123!', hash)).toBe(false);
  });
});

