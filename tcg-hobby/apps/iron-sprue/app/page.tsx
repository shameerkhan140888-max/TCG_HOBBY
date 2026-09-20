import launchProducts from '../data/launch-products.json';
import {
  getIronSprueBrandPresentation,
  getIronSprueHeroSlides,
  getIronSprueHomepagePlacements,
  getIronSprueStorefrontProducts,
  featuredProductSlugsFromPlacements,
  ironSpruePopularModelsDefaultPlacement,
  ironSpruePopularModelsFallbackSlugs,
  placementByKey,
  popularModelsFallbackProducts,
  productSectionsFromPlacements,
  productsFromFeaturedPlacements,
} from '../lib/admin-storefront-controls';
import { deriveBrandsWeStock, type IronSprueProduct } from '../lib/catalogue';
import { DEFAULT_HOMEPAGE_PRODUCT_SECTION_SLUGS, getIronSprueProductionApiHomeSnapshot, shouldUseIronSprueProductionApi } from '../lib/production-api';
import { ironSprueDisplayMediaSrcSet, ironSprueDisplayMediaUrl } from '../lib/responsive-media';
import { categoryNavigation, heroSlides, hrefForCategoryLabel, promoPanels, withOfficialBrandLogos } from '../lib/storefront';
import type { CSSProperties } from 'react';
import { HeroCarousel } from '../components/hero-carousel';
import { ProductCard } from '../components/product-card';

const products = launchProducts as IronSprueProduct[];

export const dynamic = 'force-dynamic';

const categoryIconByLabel: Record<string, string> = {
  'Model Kits': '/assets/category-icons/model-kits.png',
  '3D Puzzles & Builds': '/assets/category-icons/puzzles-builds.png',
  Tools: '/assets/category-icons/tools.png',
  'Adhesives & Finishing': '/assets/category-icons/adhesives-finishing.png',
  'Paints & Weathering': '/assets/category-icons/paints-weathering.png',
};

export default async function HomePage() {
  const useProductionApi = shouldUseIronSprueProductionApi();
  const [fallbackHeroSlides, productionHome, fallbackHomepagePlacements, fallbackStorefrontProducts] = await Promise.all([
    useProductionApi ? Promise.resolve([]) : getIronSprueHeroSlides(),
    useProductionApi ? getIronSprueProductionApiHomeSnapshot({ extraProductSlugs: [...DEFAULT_HOMEPAGE_PRODUCT_SECTION_SLUGS, ...ironSpruePopularModelsFallbackSlugs] }) : Promise.resolve(null),
    useProductionApi ? Promise.resolve([]) : getIronSprueHomepagePlacements(),
    useProductionApi ? Promise.resolve([]) : getIronSprueStorefrontProducts(products),
  ]);
  const activeHeroSlides = productionHome?.heroSlides.length ? productionHome.heroSlides : fallbackHeroSlides.length ? fallbackHeroSlides : heroSlides;
  const homepagePlacements = productionHome?.homepagePlacements ?? fallbackHomepagePlacements;
  const storefrontProducts = productionHome?.products ?? fallbackStorefrontProducts;
  const previewProducts = storefrontProducts.map((product) => ({ ...product, published: true }));
  const liveBrandsWeStock = productionHome?.brandPresentation.length
    ? productionHome.brandPresentation
    : await getIronSprueBrandPresentation(previewProducts)
      .then((brands) => brands.length ? brands : withOfficialBrandLogos(deriveBrandsWeStock(previewProducts)));
  const approvedFallbackBrands = withOfficialBrandLogos(deriveBrandsWeStock(previewProducts));
  const brandMap = new Map(liveBrandsWeStock.map((brand) => [brand.name, brand]));
  approvedFallbackBrands.forEach((brand) => {
    if (!brandMap.has(brand.name)) brandMap.set(brand.name, brand);
  });
  const brandsWeStock = Array.from(brandMap.values()).sort((left, right) => (left.displayOrder ?? 999) - (right.displayOrder ?? 999) || left.name.localeCompare(right.name));
  const productBySlug = new Map(storefrontProducts.map((product) => [product.slug, product]));
  const hasFeaturedProductPlacements = featuredProductSlugsFromPlacements(homepagePlacements).length > 0;
  const newArrivals = hasFeaturedProductPlacements
    ? productsFromFeaturedPlacements(storefrontProducts, homepagePlacements, 4)
    : popularModelsFallbackProducts(storefrontProducts, 4);
  const productSections = productSectionsFromPlacements(storefrontProducts, homepagePlacements);
  const homepagePromoPanels = promoPanels.slice(0, 3);
  const featuredPlacement = placementByKey(homepagePlacements, 'featured-products');
  const brandPlacement = placementByKey(homepagePlacements, 'brand-carousel');
  const launchCategories = categoryNavigation.map((item) => item.label);

  return (
    <>
      <section className="hero">
        <HeroCarousel slides={activeHeroSlides} />
      </section>

      <div className="homepage-board">
        <section className="category-strip" aria-label="Shop categories">
          {launchCategories.map((item) => (
            <a href={hrefForCategoryLabel(item)} key={item}>
              <img
                src={categoryIconByLabel[item]}
                alt=""
                width="320"
                height="180"
                loading="eager"
                decoding="async"
                aria-hidden="true"
              />
              {item}
            </a>
          ))}
        </section>

        <section className="promo-grid" aria-label="Special offers">
          {homepagePromoPanels.map((panel) => (
            <article className="promo-card" key={panel.title}>
              <img
                src={ironSprueDisplayMediaUrl(panel.image, 640)}
                srcSet={ironSprueDisplayMediaSrcSet(panel.image, [480, 640, 960])}
                sizes="(max-width: 700px) 100vw, 31vw"
                alt={panel.alt}
                width="900"
                height="600"
                loading="lazy"
                decoding="async"
              />
              <div>
                <p className="eyebrow">{panel.eyebrow}</p>
                <h2>{panel.title}</h2>
                <p>{panel.copy}</p>
                <a className="button" href={panel.href}>{panel.cta}</a>
              </div>
            </article>
          ))}
        </section>

        <section className="section-block">
          <div className="section-head split">
            <div>
              <p className="eyebrow">Popular models</p>
              <h2>{featuredPlacement?.title || ironSpruePopularModelsDefaultPlacement.title}</h2>
            </div>
            <a className="text-link" href={featuredPlacement?.ctaHref || ironSpruePopularModelsDefaultPlacement.ctaHref}>
              {featuredPlacement?.ctaLabel || ironSpruePopularModelsDefaultPlacement.ctaLabel}
            </a>
          </div>
          <div className="product-grid">
            {newArrivals.map((product) => <ProductCard product={product} key={product.sku} />)}
          </div>
        </section>

        {productSections.map((section) => (
          <section className="section-block" key={section.sectionKey}>
            <div className="section-head split">
              <div>
                <p className="eyebrow">{section.eyebrow}</p>
                <h2>{section.heading}</h2>
              </div>
              {section.ctaHref ? (
                <a className="text-link" href={section.ctaHref}>
                  {section.ctaLabel || 'View section'}
                </a>
              ) : null}
            </div>
            <div className="product-grid">
              {section.products.map((product) => <ProductCard product={product} key={product.sku} />)}
            </div>
          </section>
        ))}
      </div>
      <section className="brand-carousel homepage-brand-carousel" aria-label="Brands we stock">
        <h2>{brandPlacement?.title || 'Brands we stock'}</h2>
        <div className="brand-stage">
          <div className="brand-viewport" aria-live="off" style={{ '--brand-count': Math.max(brandsWeStock.length, 1) } as CSSProperties}>
            {brandsWeStock.map((brand, index) => (
            <a
              className="brand-feature"
              href={brand.href}
              aria-label={`Shop ${brand.name} products`}
              style={{ '--brand-index': index } as CSSProperties}
              key={brand.slug}
            >
              <img src={brand.logoUrl} alt={brand.altText} width="340" height="130" />
            </a>
            ))}
          </div>
        </div>
        <ol className="carousel-dots" aria-label="Brand carousel position">
          {brandsWeStock.map((brand, index) => (
            <li key={brand.slug} aria-current={index === 0 ? 'true' : undefined} />
          ))}
        </ol>
      </section>
    </>
  );
}
