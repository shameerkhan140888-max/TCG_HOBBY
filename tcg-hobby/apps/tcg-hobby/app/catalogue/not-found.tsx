import { Button, Container, EmptyState } from '@tcg-hobby/ui';

export default function CatalogueNotFound() {
  return (
    <main className="min-h-screen bg-surface-ink text-neutral-50">
      <Container className="py-16">
        <EmptyState
          title="Catalogue page not found"
          description="The page you requested does not exist or has been moved. Return to the catalogue to continue browsing the seeded inventory."
          action={
            <Button asChild>
              <a href="/catalogue">Back to catalogue</a>
            </Button>
          }
        />
      </Container>
    </main>
  );
}
