import { notFound } from 'next/navigation';
import { CatalogueListing } from '../../../components/catalogue-listing';
import { getIronSprueStorefrontProducts } from '../../../lib/admin-storefront-controls';
import launchProducts from '../../../data/launch-products.json';
import { type IronSprueProduct } from '../../../lib/catalogue';
import { slugForCategory } from '../../../lib/storefront';

export const dynamic = 'force-dynamic';

const products = launchProducts as IronSprueProduct[];

const showcaseRoutes: Record<string, {
  eyebrow: string;
  fixedBrand?: string;
  fixedCategory?: string;
  lead: string;
  title: string;
}> = {
  aoshima: {
    eyebrow: 'Aoshima showcase',
    fixedBrand: 'Aoshima',
    lead: 'Aoshima model kits selected for automotive builders, snap-kit projects and display-ready bench time.',
    title: 'Aoshima model kits',
  },
  cubicfun: {
    eyebrow: 'CubicFun showcase',
    fixedBrand: 'CubicFun',
    lead: 'CubicFun architecture and display builds for shelf-ready landmarks and focused assembly projects.',
    title: 'CubicFun 3D builds',
  },
  '3d-puzzles-and-builds': {
    eyebrow: '3D puzzles and builds',
    fixedCategory: '3d-puzzles-and-builds',
    lead: 'Architecture kits, puzzle objects and decorative display builds from CubicFun and Pintoo.',
    title: '3D puzzles and builds',
  },
  'model-kits': {
    eyebrow: 'Model kits',
    fixedCategory: 'model-kits',
    lead: 'A dedicated model-kit range led by Aoshima automotive subjects and display-focused builds.',
    title: 'Model kits',
  },
  offers: {
    eyebrow: 'Special offers',
    lead: 'Current Iron Sprue offers and bundle savings.',
    title: 'Special offers',
  },
  pintoo: {
    eyebrow: 'Pintoo showcase',
    fixedBrand: 'Pintoo',
    lead: 'Pintoo 3D puzzle objects and decorative builds designed to become finished display pieces.',
    title: 'Pintoo puzzle objects',
  },
};

export default async function ShopShowcasePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const route = showcaseRoutes[slug] ?? await categoryRouteForSlug(slug);
  if (!route) notFound();
  const resolvedSearchParams = await searchParams;
  const routeSearchParams = slug === 'offers'
    ? { ...resolvedSearchParams, offers: resolvedSearchParams.offers ?? 'true' }
    : resolvedSearchParams;

  return <CatalogueListing {...route} searchParams={routeSearchParams} />;
}

async function categoryRouteForSlug(slug: string) {
  const storefrontProducts = await getIronSprueStorefrontProducts(products);
  const category = storefrontProducts.find((product) => slugForCategory(product.category) === slug)?.category;
  if (!category) return null;
  return {
    eyebrow: 'Iron Sprue category',
    fixedCategory: slug,
    lead: `Browse ${category.toLowerCase()} from the Iron Sprue range.`,
    title: category,
  };
}
