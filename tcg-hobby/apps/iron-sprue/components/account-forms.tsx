'use client';

import { useActionState } from 'react';
import {
  loginIronSprueCustomerAction,
  logoutIronSprueCustomerAction,
  registerIronSprueCustomerAction,
  updateIronSprueProfileAction,
  type IronSprueAuthState,
} from '../lib/auth-actions';

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="form-error">{message}</p>;
}

export function IronSprueLoginForm() {
  const [state, action, pending] = useActionState<IronSprueAuthState, FormData>(loginIronSprueCustomerAction, { fieldErrors: {} });
  return (
    <form action={action} className="auth-panel">
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <FieldError message={state.fieldErrors.email} />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <FieldError message={state.fieldErrors.password} />
      <button type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Sign in'}</button>
      <a href="/forgot-password">Forgotten your password?</a>
      <a href="/register">Create an Iron Sprue account</a>
    </form>
  );
}

export function IronSprueRegisterForm() {
  const [state, action, pending] = useActionState<IronSprueAuthState, FormData>(registerIronSprueCustomerAction, { fieldErrors: {} });
  return (
    <form action={action} className="auth-panel">
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <label htmlFor="name">Name</label>
      <input id="name" name="name" type="text" autoComplete="name" />
      <FieldError message={state.fieldErrors.name} />
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <FieldError message={state.fieldErrors.email} />
      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required />
      <FieldError message={state.fieldErrors.password} />
      <label htmlFor="confirmPassword">Confirm password</label>
      <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      <FieldError message={state.fieldErrors.confirmPassword} />
      <label className="checkbox-line">
        <input name="privacyConsent" type="checkbox" value="yes" />
        <span>I agree to Iron Sprue creating my account and handling my information as described in the <a href="/privacy">Privacy Policy</a>.</span>
      </label>
      <FieldError message={state.fieldErrors.privacyConsent} />
      <button type="submit" disabled={pending}>{pending ? 'Creating account...' : 'Create account'}</button>
      <a href="/login">Already have an account?</a>
    </form>
  );
}

export function IronSprueProfileForm({ name, email }: { name: string | null; email: string }) {
  const [state, action, pending] = useActionState<IronSprueAuthState, FormData>(updateIronSprueProfileAction, { fieldErrors: {} });
  return (
    <form action={action} className="auth-panel">
      {state.success ? <p className="form-success">{state.success}</p> : null}
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <label htmlFor="name">Name</label>
      <input id="name" name="name" type="text" defaultValue={name ?? ''} autoComplete="name" />
      <FieldError message={state.fieldErrors.name} />
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" value={email} disabled />
      <button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save profile'}</button>
    </form>
  );
}

export function IronSprueLogoutForm() {
  return (
    <form action={logoutIronSprueCustomerAction}>
      <button type="submit" className="button secondary">Sign out</button>
    </form>
  );
}
