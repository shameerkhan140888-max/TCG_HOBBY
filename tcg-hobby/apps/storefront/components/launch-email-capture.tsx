import { Button, ErrorMessage, FormField, Input } from '@tcg-hobby/ui';
import { captureLaunchEmailAction } from '../lib/launch-actions';

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
    <form action={captureLaunchEmailAction} className={compact ? 'space-y-2.5 sm:space-y-3' : 'space-y-4'}>
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className={compact ? 'flex flex-col gap-3 sm:flex-row' : 'space-y-3'}>
        <FormField
          label="Email address"
          htmlFor={`launch-email-${source}`}
          error={error}
          className={compact ? 'min-w-0 flex-1' : undefined}
        >
          <Input
            id={`launch-email-${source}`}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="collector@example.com"
          />
        </FormField>
        <div className={compact ? 'sm:pt-7' : undefined}>
          <Button type="submit" className={compact ? 'w-full sm:w-auto' : 'w-full'}>
            Join the launch list
          </Button>
        </div>
      </div>
      <ErrorMessage>{error === 'save' ? 'We could not save that email just now. Please try again.' : undefined}</ErrorMessage>
      {saved ? (
        <p className="text-sm font-medium text-emerald-300">
          You’re on the list. We’ll keep you updated as TCG Hobby gets ready to launch.
        </p>
      ) : null}
      <p className="text-xs leading-5 text-neutral-500">No spam. Only launch news, release updates and selected offers.</p>
    </form>
  );
}
