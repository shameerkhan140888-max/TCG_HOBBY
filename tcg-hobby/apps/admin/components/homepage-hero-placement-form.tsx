'use client';

import type { HeroPlacementProductOption } from '@tcg-hobby/database';
import {
  Button,
  FormField,
  Input,
  ProductImageMedia,
  ProductImagePlaceholder,
} from '@tcg-hobby/ui';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  saveHomepageHeroPlacementAction,
  type HeroPlacementFormState,
} from '../lib/storefront-content-actions.server';
import { getRecommendedHeroDisplayMode, resolveHeroPreviewImage } from '../lib/hero-display';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Saving...' : 'Save hero placement'}
    </Button>
  );
}

function errorProps(state: HeroPlacementFormState, field: keyof HeroPlacementFormState['values']) {
  const invalid = Boolean(state.fieldErrors[field]);
  return {
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? `${field}-error` : undefined,
  };
}

function previewFocalClass(focalPoint: HeroPlacementFormState['values']['focalPoint']) {
  if (focalPoint === 'LEFT') return 'object-left';
  if (focalPoint === 'RIGHT') return 'object-[70%_center]';
  return 'object-center';
}

function previewOverlayClass(overlayStrength: HeroPlacementFormState['values']['overlayStrength']) {
  if (overlayStrength === 'LIGHT') return 'from-black/75 via-black/35 to-transparent';
  if (overlayStrength === 'STRONG') return 'from-black via-black/75 to-black/15';
  return 'from-black/95 via-black/60 to-transparent';
}

export function HomepageHeroPlacementForm({
  initialState,
  products,
  storefrontOrigin,
}: {
  initialState: HeroPlacementFormState;
  products: HeroPlacementProductOption[];
  storefrontOrigin: string;
}) {
  const [state, formAction] = useActionState(saveHomepageHeroPlacementAction, initialState);
  const [productId, setProductId] = useState(initialState.values.productId);
  const [headline, setHeadline] = useState(initialState.values.headline);
  const [ctaHref, setCtaHref] = useState(initialState.values.ctaHref);
  const [imageUrl, setImageUrl] = useState(initialState.values.imageUrl);
  const [imageAlt, setImageAlt] = useState(initialState.values.imageAlt);
  const [imageSource, setImageSource] = useState(initialState.values.imageSource);
  const [selectedProductImageId, setSelectedProductImageId] = useState(initialState.values.selectedProductImageId);
  const [displayMode, setDisplayMode] = useState(initialState.values.displayMode);
  const [focalPoint, setFocalPoint] = useState(initialState.values.focalPoint);
  const [overlayStrength, setOverlayStrength] = useState(initialState.values.overlayStrength);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const uploadStatusRef = useRef<HTMLParagraphElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadPending, setUploadPending] = useState(false);
  const errorEntries = useMemo(() => Object.entries(state.fieldErrors), [state.fieldErrors]);
  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const selectedProductImage = selectedProduct?.images.find((image) => image.id === selectedProductImageId) ?? null;
  const customImageUrl = selectedProductImage?.url || imageUrl.trim();
  const previewImage = resolveHeroPreviewImage({
    imageSource,
    customImageUrl: imageUrl,
    customImageAlt: imageAlt,
    selectedImage: selectedProductImage,
    productImage: selectedProduct ? { url: selectedProduct.imageUrl, altText: selectedProduct.imageAlt } : null,
  });
  const previewImageUrl = previewImage.url;
  const previewImageSrc = previewImageUrl.startsWith('/')
    ? new URL(previewImageUrl, storefrontOrigin).toString()
    : previewImageUrl;
  const previewImageAlt = previewImage.alt;

  useEffect(() => {
    setProductId(state.values.productId);
    setHeadline(state.values.headline);
    setCtaHref(state.values.ctaHref);
    setImageUrl(state.values.imageUrl);
    setImageAlt(state.values.imageAlt);
    setImageSource(state.values.imageSource);
    setSelectedProductImageId(state.values.selectedProductImageId);
    setDisplayMode(state.values.displayMode);
    setFocalPoint(state.values.focalPoint);
    setOverlayStrength(state.values.overlayStrength);
  }, [state.values]);

  useEffect(() => {
    if (!state.formError && errorEntries.length === 0) return;
    errorSummaryRef.current?.focus();
    const firstField = errorEntries[0]?.[0];
    if (firstField) {
      window.requestAnimationFrame(() => document.getElementById(firstField)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    }
  }, [errorEntries, state.formError]);

  function selectProduct(nextProductId: string) {
    const product = products.find((item) => item.id === nextProductId);
    setProductId(nextProductId);
    if (!product) return;
    setHeadline((current) => current.trim() ? current : product.name);
    setCtaHref(product.storefrontPath);
    setDisplayMode(getRecommendedHeroDisplayMode(product.imageWidth, product.imageHeight));
    if (!product.images.some((image) => image.id === selectedProductImageId)) {
      setSelectedProductImageId('');
    }
  }

  async function uploadCustomImage(formData: FormData) {
    if (!state.values.id) return;
    setUploadPending(true);
    setUploadStatus('Uploading custom hero image...');
    try {
      const response = await fetch(`/admin/storefront/heroes/${state.values.id}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json() as {
        image?: { url?: string; altText?: string };
        error?: string;
      };
      if (!response.ok || !result.image?.url) {
        throw new Error(result.error || 'Custom hero image could not be uploaded.');
      }
      setImageUrl(result.image.url);
      setImageAlt(result.image.altText || '');
      setSelectedProductImageId('');
      setImageSource('CUSTOM');
      setUploadStatus('Custom hero image uploaded successfully.');
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'Custom hero image could not be uploaded.');
    } finally {
      setUploadPending(false);
      uploadStatusRef.current?.focus();
    }
  }

  async function removeCustomImage() {
    if (!state.values.id || !window.confirm('Remove this custom hero image? Product images will not be changed.')) return;
    setUploadPending(true);
    setUploadStatus('Removing custom hero image...');
    try {
      const response = await fetch(`/admin/storefront/heroes/${state.values.id}/image/upload`, {
        method: 'DELETE',
      });
      const result = await response.json() as { error?: string; warning?: string };
      if (!response.ok) throw new Error(result.error || 'Custom hero image could not be removed.');
      setImageSource('PRODUCT');
      setSelectedProductImageId('');
      setImageUrl('');
      setImageAlt('');
      setUploadStatus(result.warning || 'Custom hero image removed. The product image is now used.');
    } catch (error) {
      setUploadStatus(error instanceof Error ? error.message : 'Custom hero image could not be removed.');
    } finally {
      setUploadPending(false);
      uploadStatusRef.current?.focus();
    }
  }

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2" aria-label="Homepage hero placement editor" noValidate>
      <input type="hidden" name="id" value={state.values.id} />
      {state.formError || errorEntries.length ? (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="md:col-span-2 rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100 outline-none focus:ring-2 focus:ring-red-300/60"
        >
          <p className="font-semibold">{state.formError}</p>
          {errorEntries.length ? (
            <ul className="mt-2 space-y-1">
              {errorEntries.map(([field, message]) => (
                <li key={field}><a href={`#${field}`} className="underline underline-offset-4">{message}</a></li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <FormField className="md:col-span-2" label="Associated product" htmlFor="productId" error={state.fieldErrors.productId} required>
        <select
          id="productId"
          name="productId"
          value={productId}
          onChange={(event) => selectProduct(event.target.value)}
          className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50"
          {...errorProps(state, 'productId')}
        >
          <option value="">Choose a product</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.published ? '' : ' (unpublished)'}</option>)}
        </select>
      </FormField>
      <FormField className="md:col-span-2" label="Headline" htmlFor="headline" error={state.fieldErrors.headline} hint="Keep to 90 characters so the title remains within the reserved hero area." required>
        <Input id="headline" name="headline" value={headline} maxLength={90} onChange={(event) => setHeadline(event.target.value)} {...errorProps(state, 'headline')} />
      </FormField>
      <FormField className="md:col-span-2" label="Supporting text" htmlFor="supportingText" error={state.fieldErrors.supportingText} hint="Keep to 180 characters. Full product information belongs on the Product detail page." required>
        <textarea
          id="supportingText"
          name="supportingText"
          defaultValue={state.values.supportingText}
          maxLength={180}
          className="min-h-28 w-full rounded-md border border-surface-line bg-surface-ink px-3 py-2 text-sm text-neutral-50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          {...errorProps(state, 'supportingText')}
        />
      </FormField>
      <FormField label="CTA label" htmlFor="ctaLabel" error={state.fieldErrors.ctaLabel} required>
        <Input id="ctaLabel" name="ctaLabel" defaultValue={state.values.ctaLabel} {...errorProps(state, 'ctaLabel')} />
      </FormField>
      <FormField label="Internal CTA path" htmlFor="ctaHref" error={state.fieldErrors.ctaHref} hint="Selecting a product fills its canonical product route." required>
        <Input id="ctaHref" name="ctaHref" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} {...errorProps(state, 'ctaHref')} />
      </FormField>
      <fieldset className="md:col-span-2 space-y-3 rounded-md border border-surface-line p-4">
        <legend className="px-1 text-sm font-semibold text-neutral-100">Hero image source</legend>
        <label className="flex items-start gap-3 text-sm text-neutral-200">
          <input
            type="radio"
            name="imageSource"
            value="PRODUCT"
            checked={imageSource === 'PRODUCT'}
            onChange={() => setImageSource('PRODUCT')}
          />
          <span><strong className="block">Use product image</strong><span className="text-neutral-400">Automatically uses the selected product&apos;s primary catalogue image.</span></span>
        </label>
        <label className="flex items-start gap-3 text-sm text-neutral-200">
          <input
            type="radio"
            name="imageSource"
            value="CUSTOM"
            checked={imageSource === 'CUSTOM'}
            onChange={() => setImageSource('CUSTOM')}
          />
          <span><strong className="block">Use custom hero image</strong><span className="text-neutral-400">Use separate promotional artwork for this homepage hero without changing the product gallery.</span></span>
        </label>
        {state.fieldErrors.imageSource ? <p id="imageSource-error" className="text-sm text-red-300">{state.fieldErrors.imageSource}</p> : null}
      </fieldset>
      <input type="hidden" name="imageUrl" value={imageUrl} />
      {imageSource === 'CUSTOM' ? (
        <div className="md:col-span-2 grid gap-4 rounded-md border border-accent/30 bg-accent/5 p-4 md:grid-cols-2">
          <FormField label="Select existing product image" htmlFor="selectedProductImageId" hint="Only active images belonging to the selected product are available.">
            <select
              id="selectedProductImageId"
              name="selectedProductImageId"
              value={selectedProductImageId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextImage = selectedProduct?.images.find((image) => image.id === nextId);
                setSelectedProductImageId(nextId);
                if (nextImage) setImageAlt(nextImage.altText);
              }}
              className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50"
            >
              <option value="">Uploaded or legacy custom image</option>
              {selectedProduct?.images.map((image, index) => (
                <option key={image.id} value={image.id}>
                  {image.isPrimary ? 'Primary image' : `Gallery image ${index + 1}`} - {image.altText}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Hero image alt text" htmlFor="imageAlt" error={state.fieldErrors.imageAlt} hint="Describe meaningful promotional artwork. The hero copy remains the primary accessible message.">
            <Input id="imageAlt" name="imageAlt" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} {...errorProps(state, 'imageAlt')} />
          </FormField>
          <div className="md:col-span-2 space-y-3">
            {state.values.id ? (
              <div
                className="flex flex-col gap-3 rounded-md bg-surface-ink p-4 sm:flex-row sm:items-end"
              >
                <FormField className="flex-1" label="Upload custom hero image" htmlFor="heroImageUpload" hint="JPEG, PNG, WebP or AVIF, up to 10 MB.">
                  <input ref={heroFileRef} id="heroImageUpload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm text-neutral-200 file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-neutral-950" />
                </FormField>
                <Button
                  type="button"
                  disabled={uploadPending || imageAlt.trim().length < 5}
                  onClick={() => {
                    const file = heroFileRef.current?.files?.[0];
                    if (!file) {
                      setUploadStatus('Choose an image to upload.');
                      uploadStatusRef.current?.focus();
                      return;
                    }
                    const formData = new FormData();
                    formData.set('image', file);
                    formData.set('altText', imageAlt);
                    void uploadCustomImage(formData);
                  }}
                >
                  {uploadPending ? 'Uploading...' : 'Upload image'}
                </Button>
              </div>
            ) : (
              <p className="rounded-md bg-surface-ink p-3 text-sm text-neutral-300">Save the hero placement before uploading dedicated artwork.</p>
            )}
            <p className="text-xs leading-5 text-neutral-400">Only upload artwork owned by TCG Hobby, supplied or licensed by the manufacturer or distributor, or otherwise authorised for commercial use.</p>
            {customImageUrl || selectedProductImageId ? (
              <Button type="button" variant="outline" disabled={uploadPending || !state.values.id} onClick={() => void removeCustomImage()}>
                Remove custom image
              </Button>
            ) : null}
            {previewImage.fallbackUsed ? (
              <p className="text-sm text-amber-300">No custom image is available. The storefront and preview will safely use the canonical product image.</p>
            ) : null}
            {uploadStatus ? <p ref={uploadStatusRef} role="status" tabIndex={-1} className="text-sm text-neutral-200 outline-none focus:ring-2 focus:ring-accent">{uploadStatus}</p> : null}
          </div>
        </div>
      ) : (
        <>
          <input type="hidden" name="selectedProductImageId" value={selectedProductImageId} />
          <input type="hidden" name="imageAlt" value={imageAlt} />
        </>
      )}
      <FormField label="Display mode" htmlFor="displayMode" error={state.fieldErrors.displayMode} hint="Full bleed blends the image into the banner. Use contained when important artwork would be cropped.">
        <select
          id="displayMode"
          name="displayMode"
          value={displayMode}
          onChange={(event) => setDisplayMode(event.target.value as typeof displayMode)}
          className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50"
          {...errorProps(state, 'displayMode')}
        >
          <option value="FULL_BLEED">Full-bleed background</option>
          <option value="CONTAINED">Contained product image</option>
        </select>
      </FormField>
      <FormField label="Image focal point" htmlFor="focalPoint" error={state.fieldErrors.focalPoint} hint="Right keeps the focal area centre-right while reserving the left for copy.">
        <select
          id="focalPoint"
          name="focalPoint"
          value={focalPoint}
          onChange={(event) => setFocalPoint(event.target.value as typeof focalPoint)}
          className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50"
          {...errorProps(state, 'focalPoint')}
        >
          <option value="LEFT">Left</option>
          <option value="CENTER">Centre</option>
          <option value="RIGHT">Right / centre-right</option>
        </select>
      </FormField>
      <FormField label="Overlay strength" htmlFor="overlayStrength" error={state.fieldErrors.overlayStrength} hint="Controls text contrast without exposing raw styling values.">
        <select
          id="overlayStrength"
          name="overlayStrength"
          value={overlayStrength}
          onChange={(event) => setOverlayStrength(event.target.value as typeof overlayStrength)}
          className="h-10 w-full rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50"
          {...errorProps(state, 'overlayStrength')}
        >
          <option value="LIGHT">Light</option>
          <option value="BALANCED">Balanced</option>
          <option value="STRONG">Strong</option>
        </select>
      </FormField>
      <FormField label="Starts at" htmlFor="startsAt" error={state.fieldErrors.startsAt}>
        <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={state.values.startsAt} {...errorProps(state, 'startsAt')} />
      </FormField>
      <FormField label="Ends at" htmlFor="endsAt" error={state.fieldErrors.endsAt}>
        <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={state.values.endsAt} {...errorProps(state, 'endsAt')} />
      </FormField>
      <FormField label="Display order" htmlFor="sortOrder" error={state.fieldErrors.sortOrder}>
        <Input id="sortOrder" name="sortOrder" type="number" min="0" defaultValue={state.values.sortOrder} {...errorProps(state, 'sortOrder')} />
      </FormField>
      <label className="flex items-center gap-3 text-sm text-neutral-200">
        <input type="checkbox" name="active" value="true" defaultChecked={state.values.active} /> Active
      </label>

      <div className="md:col-span-2 space-y-4 rounded-lg bg-surface-ink p-5" aria-label="Hero preview">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Desktop preview</p>
          {selectedProduct ? <p className="text-xs text-neutral-500">{selectedProduct.name} · {ctaHref}</p> : null}
        </div>
        <div className="relative aspect-[16/7] min-h-72 overflow-hidden rounded-md bg-black">
          {previewImageSrc ? (
            displayMode === 'FULL_BLEED' ? (
              <ProductImageMedia src={previewImageSrc} alt={previewImageAlt} className={`absolute inset-0 h-full w-full object-cover ${previewFocalClass(focalPoint)}`} fallback={<ProductImagePlaceholder compact />} />
            ) : (
              <ProductImageMedia src={previewImageSrc} alt={previewImageAlt} className="absolute inset-y-4 right-4 h-[calc(100%_-_2rem)] w-[58%] object-contain" fallback={<ProductImagePlaceholder compact />} />
            )
          ) : <ProductImagePlaceholder compact />}
          <div className={`absolute inset-0 bg-gradient-to-r ${previewOverlayClass(overlayStrength)}`} aria-hidden="true" />
          <div className="absolute inset-0 flex max-w-[58%] flex-col justify-center p-8">
            <p className="text-2xl font-black text-white">{headline || selectedProduct?.name || 'Hero headline'}</p>
            <p className="mt-2 line-clamp-3 text-sm text-neutral-200">{state.values.supportingText || 'Supporting text will appear here.'}</p>
            <span className="mt-4 w-fit rounded-md bg-accent px-4 py-2 text-xs font-bold text-neutral-950">CTA preview</span>
          </div>
        </div>
        <div className="max-w-[20rem]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Mobile preview</p>
          <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-black">
            {previewImageSrc ? (
              displayMode === 'FULL_BLEED' ? (
                <ProductImageMedia src={previewImageSrc} alt="" className="absolute inset-0 h-full w-full object-cover object-center" fallback={<ProductImagePlaceholder compact />} />
              ) : (
                <ProductImageMedia src={previewImageSrc} alt="" className="absolute inset-x-4 top-4 h-[48%] w-[calc(100%_-_2rem)] object-contain" fallback={<ProductImagePlaceholder compact />} />
              )
            ) : <ProductImagePlaceholder compact />}
            <div className={`absolute inset-0 bg-gradient-to-r ${previewOverlayClass(overlayStrength)}`} aria-hidden="true" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <p className="text-xl font-black text-white">{headline || selectedProduct?.name || 'Hero headline'}</p>
              <span className="mt-3 w-full rounded-md bg-accent px-4 py-2 text-center text-xs font-bold text-neutral-950">CTA preview</span>
            </div>
          </div>
        </div>
      </div>
      <div className="md:col-span-2"><SubmitButton /></div>
    </form>
  );
}
