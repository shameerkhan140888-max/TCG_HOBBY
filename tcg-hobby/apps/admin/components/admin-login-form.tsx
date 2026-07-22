'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input } from '@tcg-hobby/ui';
import { loginAdminAction, type AdminLoginState } from '../lib/auth-actions.server';

const initialState: AdminLoginState = { fieldErrors: {}, values: { email: '' } };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button className="w-full" type="submit" disabled={pending}>{pending ? 'Signing in...' : 'Continue'}</Button>;
}

export function AdminLoginForm({ callbackUrl, passwordResetUrl }: { callbackUrl: string; passwordResetUrl: string }) {
  const [state, action] = useActionState(loginAdminAction, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.formError ? <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.formError}</p> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300" htmlFor="email">Email</label>
        <Input id="email" name="email" type="email" autoComplete="username" defaultValue={state.values.email} aria-invalid={Boolean(state.fieldErrors.email)} aria-describedby={state.fieldErrors.email ? 'email-error' : undefined} required />
        {state.fieldErrors.email ? <p id="email-error" className="text-sm text-red-300">{state.fieldErrors.email}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-300" htmlFor="password">Password</label>
        <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(state.fieldErrors.password)} aria-describedby={state.fieldErrors.password ? 'password-error' : undefined} required />
        {state.fieldErrors.password ? <p id="password-error" className="text-sm text-red-300">{state.fieldErrors.password}</p> : null}
      </div>
      <div className="text-right"><a className="text-sm text-orange-300 hover:text-orange-200" href={passwordResetUrl}>Forgot password?</a></div>
      <SubmitButton />
    </form>
  );
}
