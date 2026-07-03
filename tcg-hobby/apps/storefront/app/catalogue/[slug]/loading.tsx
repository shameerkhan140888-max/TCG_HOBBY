import { Container } from '@tcg-hobby/ui';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export default function LoadingProductPage() {
  return (
    <main className="min-h-screen bg-surface-ink text-neutral-50">
      <Container className="py-8">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-10 w-80 max-w-full" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SkeletonBlock className="min-h-[420px] w-full" />
          <div className="space-y-4 rounded-lg border border-surface-line bg-surface-base p-6">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-12 w-96 max-w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
