import type { Metadata } from 'next';
import { Button, Container, PageShell, Section } from '@tcg-hobby/ui';
import { unsubscribeMarketingSubscriberByToken } from '@tcg-hobby/database';
import { LaunchHeader } from '../../components/launch-header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unsubscribe | TCG Hobby',
  description: 'Manage your TCG Hobby marketing email subscription.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] ?? '' : params.token ?? '';
  const result = await unsubscribeMarketingSubscriberByToken(token);

  return (
    <PageShell>
      <LaunchHeader />
      <main className="min-h-[70vh] bg-surface-ink text-neutral-50">
        <Section className="py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-2xl rounded-lg border border-surface-line bg-surface-base p-6 shadow-[0_18px_54px_rgba(0,0,0,0.24)] sm:p-8">
              {result.ok ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Email preferences</p>
                  <h1 className="text-3xl font-black">You have been unsubscribed from TCG Hobby email updates.</h1>
                  <p className="text-sm leading-6 text-neutral-400">
                    You will no longer receive marketing emails from us. Essential service emails relating to any orders or
                    account activity may still be sent where necessary.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Email preferences</p>
                  <h1 className="text-3xl font-black">This unsubscribe link is not valid.</h1>
                  <p className="text-sm leading-6 text-neutral-400">
                    The link may have expired or been copied incorrectly. No email address has been shown or changed.
                  </p>
                </div>
              )}
              <Button asChild className="mt-6">
                <a href="https://tcg-hobby.co.uk">Return to TCG Hobby</a>
              </Button>
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
