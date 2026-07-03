import { describe, expect, it } from 'vitest';
import { validateLoginInput, validateProfileInput, validateRegisterInput } from './validation';

describe('auth validation', () => {
  it('accepts a valid registration payload', () => {
    const result = validateRegisterInput({
      email: 'sam.customer@tcghobby.test',
      password: 'SamCollector123!',
      confirmPassword: 'SamCollector123!',
    });

    expect(result.ok).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });

  it('flags invalid login details without leaking extra data', () => {
    const result = validateLoginInput({
      email: 'bad-email',
      password: 'short',
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.email).toBeTruthy();
    expect(result.fieldErrors.password).toBeTruthy();
  });

  it('requires a non-empty profile name', () => {
    const result = validateProfileInput({ name: '   ' });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors.name).toBe('Name is required.');
  });
});

