'use client';

import { useState } from 'react';

type FormState = {
  tone: 'idle' | 'success' | 'error';
  message: string;
};

export function LaunchListForm() {
  const [state, setState] = useState<FormState>({ tone: 'idle', message: '' });
  const [pending, setPending] = useState(false);

  return (
    <form
      className="launch-list-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const email = String(formData.get('email') ?? '');
        const consent = formData.get('consent') === 'on';
        const website = String(formData.get('website') ?? '');

        if (!consent) {
          setState({ tone: 'error', message: 'Please confirm marketing consent before joining the Iron Sprue launch list.' });
          return;
        }

        setPending(true);
        setState({ tone: 'idle', message: '' });

        try {
          const response = await fetch('/api/launch-list', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, consent, website }),
          });
          const payload = await response.json().catch(() => ({})) as { duplicate?: boolean; message?: string };
          if (!response.ok) {
            throw new Error(payload.message || 'Signup could not be completed.');
          }
          form.reset();
          setState({
            tone: 'success',
            message: payload.duplicate ? 'You are already on the Iron Sprue launch list.' : 'You are on the Iron Sprue launch list.',
          });
        } catch (error) {
          setState({
            tone: 'error',
            message: error instanceof Error ? error.message : 'Signup could not be completed.',
          });
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor="footer-email">Email address</label>
      <input id="footer-email" name="email" type="email" placeholder="Enter your email address" required />
      <input className="website-field" name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <button type="submit" disabled={pending}>{pending ? 'Joining...' : 'Join the list'}</button>
      <label className="consent-check" htmlFor="launch-list-consent">
        <input id="launch-list-consent" name="consent" type="checkbox" required />
        <span>
          I agree to receive marketing emails from Iron Sprue and understand I can unsubscribe at any time.
          {' '}<a href="/privacy">Privacy Policy</a>
        </span>
      </label>
      {state.message ? (
        <p className={`form-status ${state.tone}`} role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
