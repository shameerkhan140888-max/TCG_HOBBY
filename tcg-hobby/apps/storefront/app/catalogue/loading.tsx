import { Container } from '@tcg-hobby/ui';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export default function LoadingCataloguePage() {
  return (
    <main className="min-h-screen bg-surface-ink text-neutral-50">
      <Container className="py-8">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-10 w-96 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-3xl" />
        </div>
        <div className="mt-8 grid gap-3 rounded-lg border border-surface-line bg-surface-base p-4 lg:grid-cols-[1fr_220px_140px]">
          <SkeletonBlock className="h-10" />
          <SkeletonBlock className="h-10" />
          <SkeletonBlock className="h-10" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-surface-line bg-surface-base p-4">
              <SkeletonBlock className="aspect-[5/4] w-full" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-6 w-3/4" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
