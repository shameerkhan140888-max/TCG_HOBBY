import { Button } from '@tcg-hobby/ui';
import { formatMoney } from '@tcg-hobby/utils';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-50">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-400">TCG Hobby</p>
          <h1 className="max-w-3xl text-5xl font-bold">Premium trading card commerce for players and collectors.</h1>
          <p className="max-w-2xl text-lg text-neutral-300">
            Storefront, deck tools, collection management, buylist, tournaments, rewards, and worldwide shipping in one platform.
          </p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Featured sealed product</p>
          <h2 className="mt-2 text-2xl font-semibold">Arcane Booster Box</h2>
          <p className="mt-1 text-orange-400">{formatMoney({ amountMinor: 11999, currency: 'GBP' })}</p>
          <Button className="mt-5">View catalogue</Button>
        </div>
      </section>
    </main>
  );
}
