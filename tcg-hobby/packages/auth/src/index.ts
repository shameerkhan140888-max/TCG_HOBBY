export {
  canAccessAdmin,
  canAccessCustomerAccount,
  createSessionExpiry,
  generateSessionToken,
  requireCustomerAccount,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from './session';
export type { CustomerSession, SessionRole, SessionUser } from './session';
export { hashPassword, verifyPassword } from './password';
export {
  normalizeEmail,
  validateEmail,
  validateLoginInput,
  validatePassword,
  validateProfileInput,
  validateRegisterInput,
} from './validation';
export type { FieldErrors, LoginFormInput, ProfileFormInput, RegisterFormInput } from './validation';
