import { Button, Container, EmptyState } from '@tcg-hobby/ui';

export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-surface-ink text-neutral-50">
      <Container className="py-16">
        <EmptyState
          title="Product not found"
          description="This product is not available in the seeded catalogue. Head back to the catalogue or browse another category."
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
