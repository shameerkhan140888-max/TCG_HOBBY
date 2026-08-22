export {
  canAccessAdmin,
  canAccessCustomerAccount,
  createSessionExpiry,
  generateSessionToken,
  requireCustomerAccount,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from './session.js';
export type { CustomerSession, SessionRole, SessionUser } from './session.js';
export { hashPassword, verifyPassword } from './password.js';
export {
  normalizeEmail,
  validateEmail,
  validateLoginInput,
  validatePassword,
  validateProfileInput,
  validateRegisterInput,
} from './validation.js';
export type { FieldErrors, LoginFormInput, ProfileFormInput, RegisterFormInput } from './validation.js';
