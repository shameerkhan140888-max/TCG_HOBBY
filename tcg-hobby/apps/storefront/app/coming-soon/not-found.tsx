import { Button, Container, PageShell, Section } from '@tcg-hobby/ui';

export default function ComingSoonNotFound() {
  return (
    <PageShell>
      <Section className="py-16">
        <Container className="space-y-4">
          <h1 className="text-3xl font-black text-neutral-50">Coming soon release not found</h1>
          <p className="max-w-2xl text-sm leading-6 text-neutral-400">This release preview is no longer available. Open the release calendar to explore the current launch list.</p>
          <Button asChild>
            <a href="/releases">Open release calendar</a>
          </Button>
        </Container>
      </Section>
    </PageShell>
  );
}
