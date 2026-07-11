import { notFound } from 'next/navigation';
import { Button, Container, FormSection, PageHeader, Section, StatusBadge } from '@tcg-hobby/ui';
import { MarketingSubscriberStatus, getMarketingSubscriberById } from '@tcg-hobby/database';
import { updateSubscriberStatusAction, updateSubscriberTagsAction } from '../../../../../lib/marketing-actions.server';

export const dynamic = 'force-dynamic';

function formatDate(value: Date | null) {
  if (!value) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export default async function MarketingSubscriberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subscriber = await getMarketingSubscriberById(id);

  if (!subscriber) {
    notFound();
  }

  const tagSlugs = subscriber.tags.map((assignment) => assignment.tag.slug).join(', ');

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Marketing subscriber"
          title={subscriber.email}
          description="Review subscription state, source metadata, tags, and email delivery notes."
          actions={
            <Button asChild variant="outline">
              <a href="/admin/marketing/subscribers">Back to subscribers</a>
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <FormSection title="Subscriber profile" description="Core reusable subscriber record. Email addresses are shown only inside admin.">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="mt-1 font-semibold text-neutral-50">{subscriber.email}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">First name</dt>
                  <dd className="mt-1 text-neutral-300">{subscriber.firstName ?? 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Status</dt>
                  <dd className="mt-1">
                    <StatusBadge tone={subscriber.status === MarketingSubscriberStatus.ACTIVE ? 'success' : 'warning'}>
                      {subscriber.status}
                    </StatusBadge>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Marketing consent</dt>
                  <dd className="mt-1 text-neutral-300">{subscriber.marketingConsent ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Source</dt>
                  <dd className="mt-1 text-neutral-300">{subscriber.source}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Last updated source</dt>
                  <dd className="mt-1 text-neutral-300">{subscriber.lastUpdatedSource ?? 'Not recorded'}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Created</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Last signup</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.lastSignupAt)}</dd>
                </div>
              </dl>
            </FormSection>

            <FormSection title="Delivery state" description="Used by campaign eligibility and future email operations.">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-neutral-500">Confirmation sent</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.confirmationEmailSentAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Last confirmation attempt</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.confirmationEmailLastAttemptAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Last email sent</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.lastEmailSentAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Unsubscribed</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.unsubscribedAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Bounced</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.bouncedAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Suppressed</dt>
                  <dd className="mt-1 text-neutral-300">{formatDate(subscriber.suppressedAt)}</dd>
                </div>
              </dl>
              {subscriber.confirmationEmailError ? (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-100">
                  {subscriber.confirmationEmailError}
                </p>
              ) : null}
            </FormSection>
          </div>

          <div className="space-y-4">
            <FormSection title="Update status">
              <form action={updateSubscriberStatusAction} className="space-y-3">
                <input type="hidden" name="subscriberId" value={subscriber.id} />
                <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                  Status
                  <select name="status" defaultValue={subscriber.status} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                    {Object.values(MarketingSubscriberStatus).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <Button type="submit" className="w-full">Update status</Button>
              </form>
            </FormSection>

            <FormSection title="Tags" description="Comma-separated tag slugs. Existing launch tags are reusable for future campaign targeting.">
              <form action={updateSubscriberTagsAction} className="space-y-3">
                <input type="hidden" name="subscriberId" value={subscriber.id} />
                <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                  Tag slugs
                  <textarea
                    name="tags"
                    defaultValue={tagSlugs}
                    rows={5}
                    className="w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                </label>
                <Button type="submit" className="w-full" variant="outline">Save tags</Button>
              </form>
            </FormSection>

            <FormSection title="Linked customer">
              {subscriber.customer ? (
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-neutral-500">Customer</dt>
                    <dd className="mt-1 text-neutral-300">{subscriber.customer.name ?? subscriber.customer.email}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Customer email</dt>
                    <dd className="mt-1 text-neutral-300">{subscriber.customer.email}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm leading-6 text-neutral-400">No customer account is linked yet.</p>
              )}
            </FormSection>
          </div>
        </div>
      </Container>
    </Section>
  );
}
