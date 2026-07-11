import { ErrorMessage, FormField, Input } from '@tcg-hobby/ui';
import { captureLaunchEmailAction } from '../lib/launch-actions';
import { LaunchEmailSubmitButton } from './launch-email-submit-button';

export function LaunchEmailCapture({
  source,
  compact = false,
  saved = false,
  error,
  returnTo = '/',
}: {
  source: string;
  compact?: boolean;
  saved?: boolean;
  error?: string | undefined;
  returnTo?: string;
}) {
  return (
    <form action={captureLaunchEmailAction} className={compact ? 'space-y-3' : 'space-y-4'}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`launch-company-${source}`}>Company</label>
        <input id={`launch-company-${source}`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className={compact ? 'grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)_auto]' : 'space-y-3'}>
        <FormField
          label="First name (optional)"
          htmlFor={`launch-first-name-${source}`}
          className={compact ? 'min-w-0' : undefined}
        >
          <Input
            id={`launch-first-name-${source}`}
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="First name"
          />
        </FormField>
        <FormField
          label="Email address"
          htmlFor={`launch-email-${source}`}
          error={error}
          className={compact ? 'min-w-0' : undefined}
        >
          <Input
            id={`launch-email-${source}`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="collector@example.com"
            required
          />
        </FormField>
        <div className={compact ? 'sm:pt-7' : undefined}>
          <LaunchEmailSubmitButton compact={compact} />
        </div>
      </div>
      <label className="flex gap-3 rounded-md border border-surface-line/80 bg-black/20 p-3 text-sm leading-6 text-neutral-300">
        <input
          name="marketingConsent"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-surface-line bg-surface-ink text-accent focus:ring-accent"
        />
        <span>
          I agree to receive launch news, product updates and occasional marketing emails from TCG Hobby. I can unsubscribe
          at any time.
        </span>
      </label>
      <ErrorMessage aria-live="polite">
        {error === 'save' || error === 'limited' ? "We couldn't complete your signup. Please try again." : undefined}
      </ErrorMessage>
      {saved ? (
        <p className="text-sm font-medium text-emerald-300" aria-live="polite">
          You&rsquo;re on the list. Please check your inbox for confirmation.
        </p>
      ) : null}
      <p className="text-xs leading-5 text-neutral-500">
        We&rsquo;ll use your email to manage your signup and, where you have agreed, send TCG Hobby news and product updates.
        {' '}
        <a href="/privacy" className="text-neutral-300 underline decoration-accent/50 underline-offset-2 hover:text-accent-soft">
          You can unsubscribe at any time.
        </a>
      </p>
    </form>
  );
}
