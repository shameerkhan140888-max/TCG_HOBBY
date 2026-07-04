import { Button, Container, EmptyCollection, PageShell, Section } from '@tcg-hobby/ui';
import { getCustomerDecks } from '@tcg-hobby/database';
import { requireCustomerSession } from '../../lib/auth';
import { SiteHeader } from '../../components/site-header';
import { DeckList } from '@tcg-hobby/ui';

export const dynamic = 'force-dynamic';

export default async function DecksPage() {
  const session = await requireCustomerSession('/decks');
  const decks = await getCustomerDecks(session.user.id);

  return (
    <PageShell>
      <SiteHeader />
      <main className="min-h-screen bg-surface-ink text-neutral-50">
        <Section className="border-b border-surface-line bg-surface-base/80 py-10">
          <Container className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Deck builder</p>
              <h1 className="text-3xl font-black sm:text-4xl">Organise lists and prepare the next build.</h1>
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                Keep a polished view of your decks, card counts, and draft lists while the legality engine remains a future layer.
              </p>
            </div>
            <Button asChild>
              <a href="/decks/new">New deck</a>
            </Button>
          </Container>
        </Section>

        <Container className="py-10">
          {decks.length ? (
            <DeckList
              decks={decks}
              actionSlotForDeck={(deck) => (
                <Button asChild size="sm" variant="outline">
                  <a href={`/decks/${deck.id}`}>Open</a>
                </Button>
              )}
            />
          ) : (
            <EmptyCollection
              title="No decks yet"
              description="Create a list to track card counts, notes, and future build ideas."
              action={
                <Button asChild>
                  <a href="/decks/new">Create deck</a>
                </Button>
              }
            />
          )}
        </Container>
      </main>
    </PageShell>
  );
}
