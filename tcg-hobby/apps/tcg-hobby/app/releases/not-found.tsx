import { Button, Container, PageShell, Section } from '@tcg-hobby/ui';

export default function ReleasesNotFound() {
  return (
    <PageShell>
      <Section className="py-16">
        <Container className="space-y-4">
          <h1 className="text-3xl font-black text-neutral-50">Release schedule not found</h1>
          <p className="max-w-2xl text-sm leading-6 text-neutral-400">The release calendar could not be loaded. Open the coming soon hub for the latest highlighted launches.</p>
          <Button asChild>
            <a href="/coming-soon">Open coming soon hub</a>
          </Button>
        </Container>
      </Section>
    </PageShell>
  );
}
