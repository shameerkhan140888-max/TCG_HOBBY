import type { Metadata } from 'next';
import { getPublicShopLandingPage, type ShopLandingScope } from '@capital-hobby/database/storefront';
import { notFound } from 'next/navigation';
import { CataloguePageView } from '../../catalogue/page';

const pages = {
  pokemon: { scope: 'pokemon', game: 'pokemon-tcg' },
  'magic-the-gathering': { scope: 'magic-the-gathering', game: 'magic-the-gathering' },
  'one-piece': { scope: 'one-piece', game: 'one-piece-card-game' },
  'disney-lorcana': { scope: 'disney-lorcana', game: 'disney-lorcana' },
  yugioh: { scope: 'yugioh', game: 'yu-gi-oh' },
  accessories: { scope: 'accessories', category: 'accessories' },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params;
  const page = pages[game as keyof typeof pages];
  if (!page) return {};
  const content = await getPublicShopLandingPage(page.scope as ShopLandingScope).catch(() => null);
  return {
    title: content?.seoTitle || `${content?.heading ?? 'Shop'} | TCG Hobby`,
    description: content?.metaDescription || content?.supportingText,
    alternates: { canonical: `/shop/${game}` },
  };
}

export default async function GameShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { game } = await params;
  const page = pages[game as keyof typeof pages];
  if (!page) notFound();
  const content = await getPublicShopLandingPage(page.scope as ShopLandingScope);

  return (
    <CataloguePageView
      searchParams={searchParams}
      basePath={`/shop/${game}`}
      lockedGame={'game' in page ? page.game : ''}
      lockedCategory={'category' in page ? page.category : ''}
      title={content.heading}
      description={content.supportingText}
    />
  );
}
