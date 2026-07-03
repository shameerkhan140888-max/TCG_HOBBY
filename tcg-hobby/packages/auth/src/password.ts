import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_PREFIX = 'scrypt';
const PASSWORD_HASH_VERSION = '1';
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

function encodeSecret(value: Buffer) {
  return value.toString('base64url');
}

function decodeSecret(value: string) {
  return Buffer.from(value, 'base64url');
}

export function hashPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES);
  const derivedKey = scryptSync(password, salt, PASSWORD_KEY_LENGTH);

  return [
    PASSWORD_HASH_PREFIX,
    PASSWORD_HASH_VERSION,
    encodeSecret(salt),
    encodeSecret(Buffer.from(derivedKey)),
  ].join('$');
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, version, saltValue, hashValue] = storedHash.split('$');

  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    version !== PASSWORD_HASH_VERSION ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const salt = decodeSecret(saltValue);
  const expectedHash = decodeSecret(hashValue);
  const actualHash = scryptSync(password, salt, expectedHash.length);

  if (actualHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(actualHash), expectedHash);
}

