import {
  getHeroPlacementProductOptions,
  getHomepageHeroPlacements,
  getShopLandingPage,
  getStorefrontBanners,
  SHOP_LANDING_DEFAULTS,
  STOREFRONT_BANNER_ICONS,
  type ShopLandingScope,
} from '@capital-hobby/database';
import { Button, Card, CardContent, Container, FormField, Input, Section } from '@capital-hobby/ui';
import {
  saveShopLandingPageAction,
  saveStorefrontBannerAction,
} from '../../../lib/storefront-content-actions.server';
import type { HeroPlacementFormState } from '../../../lib/storefront-content-actions.server';
import { HomepageHeroPlacementForm } from '../../../components/homepage-hero-placement-form';
import { getStorefrontUrl } from '../../../lib/site';

export const dynamic = 'force-dynamic';

function dateValue(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 16) : '';
}

function Textarea({ id, name, defaultValue }: { id: string; name: string; defaultValue?: string | null | undefined }) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue ?? ''}
      className="min-h-28 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

export default async function AdminStorefrontPage({
  searchParams,
}: {
  searchParams: Promise<{ hero?: string; banner?: string; scope?: string; saved?: string }>;
}) {
  const query = await searchParams;
  const requestedScope = query.scope as ShopLandingScope | undefined;
  const scope = requestedScope && requestedScope in SHOP_LANDING_DEFAULTS ? requestedScope : 'shop';
  const [banners, placements, products, landing] = await Promise.all([
    getStorefrontBanners(),
    getHomepageHeroPlacements(),
    getHeroPlacementProductOptions(),
    getShopLandingPage(scope),
  ]);
  const banner = query.banner === 'new'
    ? null
    : banners.find((item) => item.id === query.banner) ?? banners[0] ?? null;
  const placement = placements.find((item) => item.id === query.hero) ?? null;
  const selectedProduct = products.find((item) => item.id === placement?.productId);
  const heroInitialState: HeroPlacementFormState = {
    fieldErrors: {},
    values: {
      id: placement?.id ?? '',
      productId: placement?.productId ?? '',
      headline: placement?.headline ?? selectedProduct?.name ?? '',
      supportingText: placement?.supportingText ?? '',
      ctaLabel: placement?.ctaLabel ?? 'Shop now',
      ctaHref: placement?.ctaHref ?? selectedProduct?.storefrontPath ?? '',
      imageUrl: placement?.imageUrl ?? '',
      imageAlt: placement?.imageAlt ?? '',
      imageSource: placement?.imageSource === 'CUSTOM' || placement?.imageUrl ? 'CUSTOM' : 'PRODUCT',
      selectedProductImageId: placement?.selectedProductImageId ?? '',
      displayMode: placement?.displayMode === 'CONTAINED' ? 'CONTAINED' : 'FULL_BLEED',
      focalPoint: placement?.focalPoint === 'LEFT' || placement?.focalPoint === 'RIGHT' ? placement.focalPoint : 'CENTER',
      overlayStrength: placement?.overlayStrength === 'LIGHT' || placement?.overlayStrength === 'STRONG' ? placement.overlayStrength : 'BALANCED',
      startsAt: dateValue(placement?.startsAt),
      endsAt: dateValue(placement?.endsAt),
      sortOrder: String(placement?.sortOrder ?? 0),
      active: placement?.active ?? false,
    },
  };

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Storefront</p>
          <h1 className="mt-2 text-3xl font-black">Storefront content</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            Manage hero placements, the site-wide promotional banner and focused Shop landing-page copy without changing product records.
          </p>
          {query.saved ? <p role="status" className="mt-3 text-sm font-semibold text-emerald-300">Storefront content saved.</p> : null}
        </div>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Promotional banner</h2>
              <p className="mt-1 text-sm text-neutral-400">One eligible active banner is displayed beneath the storefront header.</p>
            </div>
            {banners.length ? (
              <div className="flex flex-wrap gap-2" aria-label="Configured promotional banners">
                {banners.map((item) => (
                  <a key={item.id} href={`/admin/storefront?banner=${item.id}`} className="rounded-md bg-surface-ink px-3 py-2 text-xs font-semibold text-neutral-200 focus:outline-none focus:ring-2 focus:ring-accent">
                    {item.label || item.message}{item.active ? '' : ' (inactive)'}
                  </a>
                ))}
              </div>
            ) : null}
            <form action={saveStorefrontBannerAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={banner?.id ?? ''} />
              <FormField label="Optional label" htmlFor="bannerLabel"><Input id="bannerLabel" name="label" defaultValue={banner?.label ?? ''} /></FormField>
              <FormField label="Icon" htmlFor="bannerIcon">
                <select id="bannerIcon" name="icon" defaultValue={banner?.icon ?? 'DELIVERY'} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50">
                  {STOREFRONT_BANNER_ICONS.map((icon) => <option key={icon} value={icon}>{icon.toLowerCase()}</option>)}
                </select>
              </FormField>
              <FormField className="md:col-span-2" label="Banner message" htmlFor="message" required>
                <Input id="message" name="message" defaultValue={banner?.message ?? ''} maxLength={180} />
              </FormField>
              <FormField label="CTA label" htmlFor="bannerCtaLabel"><Input id="bannerCtaLabel" name="ctaLabel" defaultValue={banner?.ctaLabel ?? ''} /></FormField>
              <FormField label="Internal CTA path" htmlFor="bannerCtaHref" hint="Use an internal path such as /shop."><Input id="bannerCtaHref" name="ctaHref" defaultValue={banner?.ctaHref ?? ''} /></FormField>
              <FormField label="Starts at" htmlFor="bannerStartsAt"><Input id="bannerStartsAt" name="startsAt" type="datetime-local" defaultValue={dateValue(banner?.startsAt)} /></FormField>
              <FormField label="Ends at" htmlFor="bannerEndsAt"><Input id="bannerEndsAt" name="endsAt" type="datetime-local" defaultValue={dateValue(banner?.endsAt)} /></FormField>
              <FormField label="Order" htmlFor="bannerOrder"><Input id="bannerOrder" name="sortOrder" type="number" min="0" defaultValue={String(banner?.sortOrder ?? 0)} /></FormField>
              <label className="flex items-center gap-3 text-sm text-neutral-200"><input type="checkbox" name="active" value="true" defaultChecked={banner?.active ?? false} /> Active</label>
              <div className="md:col-span-2 flex min-h-10 flex-wrap items-center justify-center gap-2 rounded-md border-t border-accent/40 bg-accent/10 px-4 py-2 text-center text-sm" aria-label="Promotional banner preview">
                <span className="text-accent" aria-hidden="true">●</span>
                {banner?.label ? <strong className="text-accent-soft">{banner.label}</strong> : null}
                <span>{banner?.message || 'Banner preview'}</span>
                {banner?.ctaLabel ? <span className="font-bold text-accent-soft">{banner.ctaLabel}</span> : null}
              </div>
              <div className="md:col-span-2 flex gap-3"><Button type="submit">Save banner</Button><Button asChild variant="outline"><a href="/admin/storefront?banner=new">New banner</a></Button></div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Homepage hero placements</h2>
              <p className="mt-1 text-sm text-neutral-400">Hero placement is independent from the Featured product flag and never changes product copy.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {placements.map((item) => <a key={item.id} href={`/admin/storefront?hero=${item.id}`} className="rounded-md bg-surface-ink px-3 py-2 text-xs font-semibold text-neutral-200 focus:ring-2 focus:ring-accent">{item.headline}</a>)}
              <a href="/admin/storefront?hero=new" className="rounded-md border border-surface-line px-3 py-2 text-xs font-semibold text-accent">New placement</a>
            </div>
            <HomepageHeroPlacementForm initialState={heroInitialState} products={products} storefrontOrigin={getStorefrontUrl()} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Shop landing pages</h2>
              <p className="mt-1 text-sm text-neutral-400">Edit concise department copy and metadata without creating a general-purpose CMS.</p>
            </div>
            <nav aria-label="Shop landing pages" className="flex flex-wrap gap-2">
              {(Object.keys(SHOP_LANDING_DEFAULTS) as ShopLandingScope[]).map((key) => (
                <a key={key} href={`/admin/storefront?scope=${key}`} aria-current={scope === key ? 'page' : undefined} className={scope === key ? 'rounded-md bg-accent px-3 py-2 text-xs font-semibold text-neutral-950' : 'rounded-md bg-surface-ink px-3 py-2 text-xs font-semibold text-neutral-200'}>{key.replaceAll('-', ' ')}</a>
              ))}
            </nav>
            <form action={saveShopLandingPageAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="scopeKey" value={scope} />
              <FormField className="md:col-span-2" label="Heading" htmlFor="landingHeading" required><Input id="landingHeading" name="heading" defaultValue={landing.heading} /></FormField>
              <FormField className="md:col-span-2" label="Supporting copy" htmlFor="landingSupportingText" required><Textarea id="landingSupportingText" name="supportingText" defaultValue={landing.supportingText} /></FormField>
              <FormField label="SEO title" htmlFor="landingSeoTitle"><Input id="landingSeoTitle" name="seoTitle" defaultValue={landing.seoTitle ?? ''} /></FormField>
              <FormField label="Meta description" htmlFor="landingMetaDescription"><Input id="landingMetaDescription" name="metaDescription" defaultValue={landing.metaDescription ?? ''} /></FormField>
              <FormField label="Optional featured product" htmlFor="landingFeaturedProduct">
                <select id="landingFeaturedProduct" name="featuredProductId" defaultValue={landing.featuredProductId ?? ''} className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50">
                  <option value="">No featured product</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </FormField>
              <FormField label="Optional hero image URL" htmlFor="landingHeroImage"><Input id="landingHeroImage" name="heroImageUrl" defaultValue={landing.heroImageUrl ?? ''} /></FormField>
              <label className="flex items-center gap-3 text-sm text-neutral-200"><input type="checkbox" name="active" value="true" defaultChecked={landing.active} /> Active</label>
              <div className="md:col-span-2"><Button type="submit">Save landing page</Button></div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
}
