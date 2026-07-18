import { Container, Section, Card, CardContent, Button } from '@tcg-hobby/ui';
import { PageHeader, StatusBadge } from '@tcg-hobby/ui';
import { getCatalogueMasterDataOverview } from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

export default async function CatalogueSettingsPage() {
  const overview = await getCatalogueMasterDataOverview();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <PageHeader
          eyebrow="Operations"
          title="Catalogue Settings"
          description="Manage the reference data that controls product classification, filters and imports."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {overview.sections.map((section) => (
            <Card key={section.kind}>
              <CardContent className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-neutral-50">{section.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">{section.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="neutral">{section.totalCount} total</StatusBadge>
                  <StatusBadge tone="success">{section.activeCount} active</StatusBadge>
                  {section.inactiveCount ? <StatusBadge tone="warning">{section.inactiveCount} inactive</StatusBadge> : null}
                </div>
                <Button asChild variant="outline">
                  <a href={section.href}>Manage {section.title}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
