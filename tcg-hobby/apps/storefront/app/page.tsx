import { Button, Card, CardContent, Container, PageShell, Section } from '@tcg-hobby/ui';
import { formatMoney } from '@tcg-hobby/utils';

const categories = [
  { name: 'Sealed Product', detail: 'Booster boxes, bundles, and elite trainer boxes', count: '128 lines' },
  { name: 'Singles', detail: 'Curated singles for competitive and casual decks', count: '14k cards' },
  { name: 'Accessories', detail: 'Sleeves, binders, deck boxes, and playmats', count: '240 items' },
  { name: 'Events', detail: 'Prereleases, leagues, and weekend tournaments', count: '18 upcoming' },
];

const products = [
  { name: 'Arcane Booster Box', game: 'Magic: The Gathering', price: { amountMinor: 11999, currency: 'GBP' as const }, badge: 'Featured' },
  { name: 'Stellar Crown Elite Trainer Box', game: 'Pokemon', price: { amountMinor: 4499, currency: 'GBP' as const }, badge: 'Popular' },
  { name: 'Matte Black Dragon Shield Sleeves', game: 'Supplies', price: { amountMinor: 1099, currency: 'GBP' as const }, badge: 'In stock' },
  { name: 'Commander Night Entry', game: 'Events', price: { amountMinor: 700, currency: 'GBP' as const }, badge: 'Friday' },
];

const navItems = ['Catalogue', 'Deck Builder', 'Buylist', 'Events', 'Rewards'];

export default function HomePage() {
  return (
    <PageShell>
      <header className="sticky top-0 z-20 border-b border-surface-line bg-surface-ink/90 backdrop-blur">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md border border-accent/50 bg-accent/15 text-sm font-black text-accent">TCG</div>
            <span className="text-base font-bold tracking-wide">TCG Hobby</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-neutral-300 lg:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="transition-colors hover:text-accent-soft">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden sm:inline-flex">
              Sign in
            </Button>
            <Button>Shop now</Button>
          </div>
        </Container>
      </header>

      <main>
        <Section className="overflow-hidden border-b border-surface-line bg-[radial-gradient(circle_at_top_right,rgba(255,122,26,0.18),transparent_34%),linear-gradient(135deg,#08080a_0%,#101014_55%,#17120e_100%)] py-14 sm:py-20">
          <Container className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl space-y-7">
              <div className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-soft">
                Premium dark commerce for TCG retailers
              </div>
              <div className="space-y-5">
                <h1 className="text-4xl font-black leading-tight text-neutral-50 sm:text-5xl lg:text-6xl">
                  Cards, sealed product, events, and player tools in one polished storefront.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  Browse featured products, manage wishlists, prepare decks, submit buylists, and register for tournaments with a fast retail experience built for collectors and players.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg">Browse catalogue</Button>
                <Button size="lg" variant="outline">
                  View events
                </Button>
              </div>
            </div>

            <Card className="shadow-glow">
              <CardContent className="p-0">
                <div className="aspect-[4/3] rounded-t-lg bg-[linear-gradient(135deg,#2a1710,#111113_55%,#29251d)] p-5">
                  <div className="grid h-full grid-cols-3 gap-3">
                    {['MTG', 'PKM', 'OP'].map((label, index) => (
                      <div
                        key={label}
                        className="rounded-md border border-white/10 bg-black/25 p-3 shadow-2xl"
                        style={{ transform: `translateY(${index * 18}px)` }}
                      >
                        <div className="h-full rounded border border-accent/30 bg-gradient-to-br from-accent/30 to-neutral-950 p-3">
                          <p className="text-xs font-bold text-accent-soft">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  {['Live stock', 'UK shipping', 'Rewards'].map((metric) => (
                    <div key={metric}>
                      <p className="text-lg font-bold text-neutral-50">{metric}</p>
                      <p className="text-sm text-neutral-400">Ready for Sprint 3</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Container>
        </Section>

        <Section id="catalogue">
          <Container>
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Featured categories</p>
                <h2 className="mt-2 text-3xl font-bold">Shop by hobby workflow</h2>
              </div>
              <Button variant="ghost">View all categories</Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => (
                <Card key={category.name} className="transition-colors hover:border-accent/60">
                  <CardContent>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-soft">{category.count}</p>
                    <h3 className="mt-3 text-xl font-bold">{category.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-neutral-400">{category.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </Section>

        <Section className="border-t border-surface-line bg-surface-base" id="featured-products">
          <Container>
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Featured products</p>
              <h2 className="mt-2 text-3xl font-bold">Retail-ready product cards</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <Card key={product.name}>
                  <CardContent className="space-y-4">
                    <div className="aspect-[5/4] rounded-md border border-surface-line bg-gradient-to-br from-surface-panel via-surface-ink to-accent/20 p-4">
                      <span className="rounded-full bg-accent px-2 py-1 text-xs font-bold text-neutral-950">{product.badge}</span>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-400">{product.game}</p>
                      <h3 className="mt-1 min-h-14 text-lg font-bold leading-7">{product.name}</h3>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-accent-soft">{formatMoney(product.price)}</p>
                      <Button size="sm" variant="secondary">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      </main>
    </PageShell>
  );
}
