import { Container, PageShell, Section } from '@tcg-hobby/ui';
import { requireCustomerSession } from '../../../lib/auth';
import { SiteHeader } from '../../../components/site-header';
import { DeckCreateForm } from '../../../components/deck-forms';

export const dynamic = 'force-dynamic';

export default async function NewDeckPage() {
  await requireCustomerSession('/decks/new');

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Deck builder</p>
            <h1 className="text-3xl font-black sm:text-4xl">Create a new deck.</h1>
            <p className="max-w-3xl text-sm leading-6 text-neutral-400">
              Start with a clean shell, then add cards as you refine the list and tune the count.
            </p>
          </Container>
        </Section>

        <Container className="py-10">
          <div className="max-w-3xl">
            <DeckCreateForm />
          </div>
        </Container>
      </main>
    </PageShell>
  );
}
