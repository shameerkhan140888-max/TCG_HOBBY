import type { CollectionItem, CollectionSummary, DeckDetail, DeckSummary } from '@tcg-hobby/types';
import type { HTMLAttributes, ReactNode } from 'react';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from './lib/cn';

function formatMoney(amountMinor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amountMinor / 100);
}

export type CardQuantityProps = HTMLAttributes<HTMLSpanElement> & {
  quantity: number;
  label?: string;
};

export function CardQuantity({ quantity, label = 'Owned', className, ...props }: CardQuantityProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent-soft', className)}
      {...props}
    >
      <span className="uppercase tracking-wide">{label}</span>
      <span>{quantity}</span>
    </span>
  );
}

export type ProgressBarProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  label?: string;
};

export function ProgressBar({ value, max = 100, label, className, ...props }: ProgressBarProps) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {label ? <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-500">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded-full border border-surface-line bg-surface-panel">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-orange-400" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export type CollectionCardProps = HTMLAttributes<HTMLDivElement> & {
  item: CollectionItem;
  actionSlot?: ReactNode;
};

export function CollectionCard({ item, actionSlot, className, ...props }: CollectionCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-50">{item.productName}</h3>
            <p className="text-sm text-neutral-400">{item.game}</p>
          </div>
          <CardQuantity quantity={item.ownedQuantity} />
        </div>
        <div className="grid gap-3 text-sm text-neutral-300 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Variant</p>
            <p className="mt-1">{item.printVariant.replaceAll('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Condition</p>
            <p className="mt-1">{item.condition.replaceAll('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Language</p>
            <p className="mt-1">{item.language}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Set</p>
            <p className="mt-1">{item.setName ?? item.categoryName}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.foil ? <Badge variant="accent">Foil</Badge> : <Badge variant="neutral">Non-foil</Badge>}
          {item.dateAcquired ? <Badge variant="neutral">Acquired {new Date(item.dateAcquired).toLocaleDateString('en-GB')}</Badge> : null}
          {item.purchasePriceMinor !== null ? <Badge variant="success">{formatMoney(item.purchasePriceMinor)}</Badge> : <Badge variant="neutral">No price recorded</Badge>}
        </div>
        {item.notes ? <p className="text-sm leading-6 text-neutral-400">{item.notes}</p> : null}
        {actionSlot ? <div className="flex items-center gap-2">{actionSlot}</div> : null}
      </CardContent>
    </Card>
  );
}

export type DeckCardProps = HTMLAttributes<HTMLDivElement> & {
  deck: DeckSummary;
  actionSlot?: ReactNode;
};

export function DeckCard({ deck, actionSlot, className, ...props }: DeckCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-50">{deck.name}</h3>
            <p className="text-sm text-neutral-400">{deck.game}</p>
          </div>
          <Badge variant={deck.visibility === 'PUBLIC' ? 'success' : 'neutral'}>{deck.visibility}</Badge>
        </div>
        <div className="grid gap-2 text-sm text-neutral-300 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Cards</p>
            <p className="mt-1">{deck.cardCount} / {deck.maxCards}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Unique cards</p>
            <p className="mt-1">{deck.uniqueCards}</p>
          </div>
        </div>
        <ProgressBar value={deck.cardCount} max={deck.maxCards} label="Deck completion" />
        {actionSlot ? <div className="flex items-center gap-2">{actionSlot}</div> : null}
      </CardContent>
    </Card>
  );
}

export type DeckListProps = HTMLAttributes<HTMLDivElement> & {
  decks: DeckSummary[];
  actionSlotForDeck?: (deck: DeckSummary) => ReactNode;
};

export function DeckList({ decks, actionSlotForDeck, className, ...props }: DeckListProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 xl:grid-cols-3', className)} {...props}>
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} actionSlot={actionSlotForDeck?.(deck)} />
      ))}
    </div>
  );
}

export type CollectionStatsProps = HTMLAttributes<HTMLDivElement> & {
  summary: CollectionSummary;
  deckCount: number;
  collectionCount: number;
};

export function CollectionStats({ summary, deckCount, collectionCount, className, ...props }: CollectionStatsProps) {
  const cards = [
    { label: 'Cards owned', value: String(summary.cardsOwned) },
    { label: 'Sets represented', value: String(summary.setsRepresented) },
    { label: 'Products represented', value: String(summary.productsRepresented) },
    { label: 'Favourite game', value: summary.favouriteGame },
    { label: 'Deck count', value: String(deckCount) },
    { label: 'Collection count', value: String(collectionCount) },
  ];

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)} {...props}>
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent>
            <p className="text-sm text-neutral-400">{card.label}</p>
            <p className="mt-3 text-2xl font-black text-neutral-50">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export type EmptyCollectionProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyCollection({ title, description, action, className, ...props }: EmptyCollectionProps) {
  return (
    <Card className={cn('border-dashed', className)} {...props}>
      <CardContent className="space-y-4 p-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export type DeckHeaderProps = HTMLAttributes<HTMLDivElement> & {
  deck: DeckDetail;
  actionSlot?: ReactNode;
};

export function DeckHeader({ deck, actionSlot, className, ...props }: DeckHeaderProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardHeader className="space-y-4 border-b border-surface-line bg-surface-panel/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black text-neutral-50">{deck.name}</CardTitle>
            <p className="text-sm text-neutral-400">{deck.game}</p>
          </div>
          <Badge variant={deck.visibility === 'PUBLIC' ? 'success' : 'neutral'}>{deck.visibility}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Cards</p>
            <p className="mt-1 text-lg font-semibold text-neutral-50">{deck.cardCount} / {deck.maxCards}</p>
          </div>
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Unique</p>
            <p className="mt-1 text-lg font-semibold text-neutral-50">{deck.uniqueCards}</p>
          </div>
          <div className="rounded-lg border border-surface-line bg-surface-ink p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">Average cost</p>
            <p className="mt-1 text-lg font-semibold text-neutral-50">{formatMoney(deck.stats.averageCostMinor)}</p>
          </div>
        </div>
        {actionSlot ? <div className="flex flex-wrap items-center gap-2">{actionSlot}</div> : null}
      </CardHeader>
    </Card>
  );
}
