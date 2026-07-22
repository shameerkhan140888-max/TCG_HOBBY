'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  AuthCard,
  Button,
  ErrorMessage,
  FormField,
  Input,
} from '@tcg-hobby/ui';
import type {
  LoginFormState,
  ProfileFormState,
  RegisterFormState,
} from '../lib/auth-actions';
import {
  loginCustomerAction,
  registerCustomerAction,
  updateProfileAction,
} from '../lib/auth-actions';

const emptyLoginState: LoginFormState = {
  fieldErrors: {},
  values: {
    email: '',
  },
};

const emptyRegisterState: RegisterFormState = {
  fieldErrors: {},
  values: {
    email: '',
  },
};

const emptyProfileState: ProfileFormState = {
  fieldErrors: {},
  values: {
    name: '',
  },
};

function SubmitButton({
  label,
  pendingLabel = 'Working...',
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function LoginForm({
  callbackUrl = '/account',
}: {
  callbackUrl?: string;
}) {
  const [state, formAction] = useActionState(
    loginCustomerAction,
    emptyLoginState,
  );

  return (
    <AuthCard
      title="Customer sign in"
      description="Access your account, wishlist, and saved details."
      footer={
        <span>
          New here?{' '}
          <a className="text-accent-soft hover:text-accent" href="/register">
            Create an account
          </a>
          .
        </span>
      }
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FormField
          label="Email"
          htmlFor="login-email"
          error={state.fieldErrors.email}
          required
        >
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values.email}
            placeholder="sam.customer@tcghobby.test"
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="login-password"
          error={state.fieldErrors.password}
          required
        >
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••"
          />
        </FormField>
        <ErrorMessage>{state.formError}</ErrorMessage>
        <div className="text-right">
          <a
            className="text-sm text-accent-soft hover:text-accent"
            href="/forgot-password"
          >
            Forgot password?
          </a>
        </div>
        <SubmitButton label="Sign in" />
      </form>
    </AuthCard>
  );
}

export function RegisterForm({
  callbackUrl = '/account',
}: {
  callbackUrl?: string;
}) {
  const [state, formAction] = useActionState(
    registerCustomerAction,
    emptyRegisterState,
  );

  return (
    <AuthCard
      title="Create your account"
      description="Save products, manage your profile, and keep shopping fast."
      footer={
        <span>
          Already have an account?{' '}
          <a className="text-accent-soft hover:text-accent" href="/login">
            Sign in
          </a>
          .
        </span>
      }
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FormField
          label="Email"
          htmlFor="register-email"
          error={state.fieldErrors.email}
          required
        >
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.values.email}
            placeholder="sam.customer@tcghobby.test"
          />
        </FormField>
        <FormField
          label="Password"
          htmlFor="register-password"
          error={state.fieldErrors.password}
          required
          hint="Use at least 10 characters with letters and numbers."
        >
          <Input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a secure password"
          />
        </FormField>
        <FormField
          label="Confirm password"
          htmlFor="register-confirm-password"
          error={state.fieldErrors.confirmPassword}
          required
        >
          <Input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
          />
        </FormField>
        <ErrorMessage>{state.formError}</ErrorMessage>
        <SubmitButton
          label="Create account"
          pendingLabel="Creating account..."
        />
      </form>
    </AuthCard>
  );
}

export function ProfileForm({
  email,
  initialName,
}: {
  email: string;
  initialName: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, {
    ...emptyProfileState,
    values: {
      name: initialName,
    },
  });

  return (
    <AuthCard
      title="Profile"
      description="Update the basic details attached to your customer account."
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-300">Email</p>
          <Input value={email} readOnly aria-readonly="true" />
        </div>
        <FormField
          label="Name"
          htmlFor="profile-name"
          error={state.fieldErrors.name}
        >
          <Input
            id="profile-name"
            name="name"
            defaultValue={state.values.name}
            placeholder="Sam Collector"
          />
        </FormField>
        <ErrorMessage>{state.formError}</ErrorMessage>
        {state.success ? (
          <p className="text-sm text-emerald-300">{state.success}</p>
        ) : null}
        <SubmitButton label="Save changes" pendingLabel="Saving..." />
      </form>
    </AuthCard>
  );
}
