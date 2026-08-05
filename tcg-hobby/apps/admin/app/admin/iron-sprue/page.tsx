import { Button, Card, CardContent, Container, Section } from '@tcg-hobby/ui';
import { PageHeader } from '@tcg-hobby/ui';
import { ironSprueAdminControls, ironSpruePlaceholderAssets } from '../../../lib/iron-sprue-admin-controls';

export const dynamic = 'force-dynamic';

export default function IronSprueAdminPage() {
  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Iron Sprue"
          title="Launch storefront controls"
          description="Use the same Admin capabilities as TCG Hobby, but only from an Admin runtime configured for the dedicated Iron Sprue database, media bucket and commerce credentials."
        />

        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-xl font-bold">Operational boundary</h2>
            <p className="max-w-4xl text-sm leading-6 text-neutral-400">
              Iron Sprue product, hero carousel, promotional banner and stocked-brand edits must run against the Iron Sprue Neon project and Iron Sprue R2 bucket. Do not use a TCG Hobby production Admin session for Iron Sprue launch content.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {ironSprueAdminControls.map((control) => (
            <Card key={control.key}>
              <CardContent className="flex h-full flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Iron Sprue control</p>
                  <h2 className="mt-2 text-xl font-bold">{control.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{control.description}</p>
                  <p className="mt-3 text-sm leading-6 text-neutral-300">{control.capability}</p>
                </div>
                <div className="mt-auto">
                  <Button asChild variant="outline">
                    <a href={control.href}>Open control</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Placeholder media</p>
              <h2 className="mt-2 text-xl font-bold">Iron Sprue generated placeholder library</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-400">
                These are original generated workshop scenes for Iron Sprue placeholders only. They are not manufacturer assets and should be replaced by approved product-led artwork when available.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {ironSpruePlaceholderAssets.map((asset) => (
                <article key={asset.href} className="overflow-hidden rounded-md border border-surface-line bg-surface-ink">
                  <img src={asset.href} alt={asset.alt} className="aspect-[4/3] w-full object-cover" />
                  <div className="space-y-2 p-4">
                    <h3 className="font-bold text-neutral-50">{asset.label}</h3>
                    <p className="text-sm leading-6 text-neutral-400">{asset.usage}</p>
                  </div>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
