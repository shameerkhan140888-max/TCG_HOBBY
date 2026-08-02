type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const signupAttempts = new Map<string, RateLimitEntry>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function isSignupRateLimited(key: string, now = Date.now()) {
  const normalizedKey = key.trim().toLowerCase();

  if (!normalizedKey) {
    return false;
  }

  const existing = signupAttempts.get(normalizedKey);

  if (!existing || existing.resetAt <= now) {
    signupAttempts.set(normalizedKey, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  const next = { ...existing, count: existing.count + 1 };
  signupAttempts.set(normalizedKey, next);

  return next.count > MAX_ATTEMPTS;
}
