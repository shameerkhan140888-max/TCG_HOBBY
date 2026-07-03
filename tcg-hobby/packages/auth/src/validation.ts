export type FieldErrors = Partial<Record<string, string>>;

export type LoginFormInput = {
  email: string;
  password: string;
};

export type RegisterFormInput = LoginFormInput & {
  confirmPassword: string;
};

export type ProfileFormInput = {
  name: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string) {
  if (!value.trim()) {
    return 'Email address is required.';
  }

  if (!EMAIL_PATTERN.test(value.trim())) {
    return 'Enter a valid email address.';
  }

  return null;
}

export function validatePassword(value: string) {
  if (!value) {
    return 'Password is required.';
  }

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include both letters and numbers.';
  }

  return null;
}

export function validateLoginInput(input: LoginFormInput) {
  const fieldErrors: FieldErrors = {};
  const email = normalizeEmail(input.email);
  const password = input.password;

  const emailError = validateEmail(input.email);
  if (emailError) {
    fieldErrors.email = emailError;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    fieldErrors.password = passwordError;
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    email,
    password,
    fieldErrors,
  };
}

export function validateRegisterInput(input: RegisterFormInput) {
  const login = validateLoginInput(input);
  const fieldErrors: FieldErrors = { ...login.fieldErrors };

  if (input.password !== input.confirmPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    email: login.email,
    password: login.password,
    confirmPassword: input.confirmPassword,
    fieldErrors,
  };
}

export function validateProfileInput(input: ProfileFormInput) {
  const fieldErrors: FieldErrors = {};
  const name = input.name.trim();

  if (!name) {
    fieldErrors.name = 'Name is required.';
  } else if (name.length > 80) {
    fieldErrors.name = 'Name must be 80 characters or fewer.';
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    name,
    fieldErrors,
  };
}

