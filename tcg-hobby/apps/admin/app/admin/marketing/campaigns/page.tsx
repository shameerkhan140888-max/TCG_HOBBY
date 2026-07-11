import { Button, Container, FormSection, PageHeader, Section, StatusBadge, AdminTable, EmptyTableState } from '@tcg-hobby/ui';
import { getMarketingCampaigns, getMarketingSubscriberDashboard } from '@tcg-hobby/database';
import { createCampaignDraftAction } from '../../../../lib/marketing-actions.server';

export const dynamic = 'force-dynamic';

function formatDate(value: Date | null) {
  if (!value) {
    return 'Not scheduled';
  }

  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

export default async function MarketingCampaignsPage() {
  const [campaigns, dashboard] = await Promise.all([
    getMarketingCampaigns(),
    getMarketingSubscriberDashboard(),
  ]);

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Marketing"
          title="Campaigns"
          description="Create campaign drafts and define future audiences. Bulk sending is intentionally not enabled yet."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            {campaigns.length ? (
              <AdminTable columns={['Campaign', 'Status', 'Audience', 'Scheduled', 'Created']}>
                <tbody className="divide-y divide-surface-line bg-surface-base">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-neutral-50">{campaign.name}</div>
                        <div className="text-xs text-neutral-500">{campaign.subject}</div>
                        {campaign.previewText ? <div className="mt-1 text-xs text-neutral-500">{campaign.previewText}</div> : null}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge tone="accent">{campaign.status}</StatusBadge>
                      </td>
                      <td className="px-4 py-4 text-neutral-300">Eligible subscribers</td>
                      <td className="px-4 py-4 text-neutral-300">{formatDate(campaign.scheduledAt)}</td>
                      <td className="px-4 py-4 text-neutral-300">{formatDate(campaign.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            ) : (
              <EmptyTableState title="No campaign drafts yet" description="Create the first draft when launch messaging is ready. Sending will be added in a later work package." />
            )}
          </div>

          <FormSection title="Create draft" description="Drafts store campaign metadata and audience intent only. They do not send email.">
            <form action={createCampaignDraftAction} className="space-y-4">
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Campaign name
                <input
                  name="name"
                  required
                  placeholder="Launch announcement"
                  className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Subject
                <input
                  name="subject"
                  required
                  placeholder="TCG Hobby is getting ready to launch"
                  className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Preview text
                <textarea
                  name="previewText"
                  rows={3}
                  placeholder="A short inbox preview for the future campaign."
                  className="w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-wide text-neutral-500">
                Audience tag
                <select name="tag" defaultValue="" className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30">
                  <option value="">All eligible subscribers</option>
                  {dashboard.tags.map((tag) => (
                    <option key={tag.slug} value={tag.slug}>{tag.label}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="w-full">Create draft</Button>
            </form>
          </FormSection>
        </div>
      </Container>
    </Section>
  );
}
