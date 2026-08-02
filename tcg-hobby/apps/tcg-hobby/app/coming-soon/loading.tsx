import { Container, PageShell, Section } from '@tcg-hobby/ui';

export default function ComingSoonLoading() {
  return (
    <PageShell>
      <Section className="py-12">
        <Container className="space-y-6">
          <div className="h-10 w-40 animate-pulse rounded bg-surface-line" />
          <div className="h-64 animate-pulse rounded-lg border border-surface-line bg-surface-base" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-lg border border-surface-line bg-surface-base" />
            ))}
          </div>
        </Container>
      </Section>
    </PageShell>
  );
}
