'use client';

import { useActionState } from 'react';
import {
  requestIronSpruePasswordResetAction,
  resetIronSpruePasswordAction,
  type IronSpruePasswordRecoveryState,
} from '../lib/password-recovery-actions';

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="form-error">{message}</p>;
}

export function IronSprueRequestPasswordResetForm() {
  const [state, action, pending] = useActionState<IronSpruePasswordRecoveryState, FormData>(requestIronSpruePasswordResetAction, { fieldErrors: {} });
  return (
    <form action={action} className="auth-panel">
      {state.success ? <p className="form-success">{state.success}</p> : null}
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="email" required />
      <FieldError message={state.fieldErrors.email} />
      <button type="submit" disabled={pending}>{pending ? 'Sending...' : 'Send reset link'}</button>
      <a href="/login">Return to sign in</a>
    </form>
  );
}

export function IronSprueResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<IronSpruePasswordRecoveryState, FormData>(resetIronSpruePasswordAction, { fieldErrors: {} });
  return (
    <form action={action} className="auth-panel">
      {state.success ? <p className="form-success">{state.success}</p> : null}
      {state.formError ? <p className="form-error">{state.formError}</p> : null}
      <input type="hidden" name="token" value={token} />
      <label htmlFor="password">New password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required />
      <FieldError message={state.fieldErrors.password} />
      <label htmlFor="confirmPassword">Confirm password</label>
      <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      <FieldError message={state.fieldErrors.confirmPassword} />
      <button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Reset password'}</button>
      <a href="/login">Sign in</a>
    </form>
  );
}
