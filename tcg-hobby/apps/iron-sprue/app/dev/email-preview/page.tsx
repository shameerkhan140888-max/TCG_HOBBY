import { notFound } from 'next/navigation';
import { importLocalCommerceDatabase } from '../../../lib/local-database';

export const dynamic = 'force-dynamic';

type IronSprueEmailOrder = {
  orderNumber: string;
  createdAt: Date;
  paidAt: Date | null;
  dispatchedAt: Date | null;
  paymentStatus: string;
  fulfilmentStatus: string;
  subtotalMinor: number;
  shippingMinor: number;
  totalMinor: number;
  currency: string;
  shippingMethodName: string | null;
  shippingFullName: string;
  shippingEmail: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingRegion: string | null;
  shippingPostalCode: string;
  shippingCountry: string;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: Array<{
    productName: string;
    productSlug: string;
    productSku: string;
    quantity: number;
    unitPriceMinor: number;
    totalMinor: number;
    imageUrl: string | null;
    imageAlt: string | null;
  }>;
};

type IronSprueEmailTemplateConfig = {
  siteUrl: string;
  supportEmail: string;
  assetBaseUrl: string;
  logoUrl: string;
};

const sampleOrder: IronSprueEmailOrder = {
  orderNumber: 'IS-20260814-PREVIEW',
  createdAt: new Date('2026-08-14T12:00:00.000Z'),
  paidAt: new Date('2026-08-14T12:03:00.000Z'),
  dispatchedAt: new Date('2026-08-15T10:00:00.000Z'),
  paymentStatus: 'SUCCEEDED',
  fulfilmentStatus: 'SHIPPED',
  subtotalMinor: 3998,
  shippingMinor: 299,
  totalMinor: 4297,
  currency: 'GBP',
  shippingMethodName: 'Standard delivery',
  shippingFullName: 'Preview Customer',
  shippingEmail: 'customer@example.com',
  shippingLine1: '4-6 Greatorex Street',
  shippingLine2: null,
  shippingCity: 'London',
  shippingRegion: null,
  shippingPostalCode: 'E1 5NF',
  shippingCountry: 'GB',
  trackingCarrier: 'Royal Mail',
  trackingNumber: 'ISPREVIEW123GB',
  trackingUrl: 'https://www.royalmail.com/track-your-item',
  items: [
    {
      productName: 'Toyota 2000GT Red',
      productSlug: 'aoshima-05628-toyota-2000gt-red',
      productSku: 'IS-AOS-05628',
      quantity: 2,
      unitPriceMinor: 1999,
      totalMinor: 3998,
      imageUrl: null,
      imageAlt: 'Toyota 2000GT Red catalogue image',
    },
  ],
};

export default async function IronSprueEmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const {
    buildIronSprueCancellationEmail,
    buildIronSprueDispatchEmail,
    buildIronSprueOrderConfirmationEmail,
    defaultIronSprueEmailLogoUrl,
  } = await importLocalCommerceDatabase();
  const config: IronSprueEmailTemplateConfig = {
    siteUrl: process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'http://localhost:3004',
    supportEmail: process.env.IRON_SPRUE_SUPPORT_EMAIL ?? 'info@ironsprue.co.uk',
    assetBaseUrl: process.env.IRON_SPRUE_EMAIL_ASSET_BASE_URL ?? process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'http://localhost:3004',
    logoUrl: process.env.IRON_SPRUE_EMAIL_LOGO_URL ?? defaultIronSprueEmailLogoUrl(process.env.IRON_SPRUE_EMAIL_ASSET_BASE_URL ?? process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'http://localhost:3004'),
  };
  const previews = [
    buildIronSprueOrderConfirmationEmail(sampleOrder, config),
    buildIronSprueCancellationEmail(sampleOrder, config, { refunded: true }),
    buildIronSprueDispatchEmail(sampleOrder, config),
  ];

  return (
    <main style={{ background: '#e8e2d6', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ fontFamily: 'Arial, sans-serif' }}>Iron Sprue transactional email previews</h1>
      <p style={{ fontFamily: 'Arial, sans-serif' }}>
        Development-only previews using representative Iron Sprue order data.
      </p>
      <div style={{ display: 'grid', gap: 24 }}>
        {previews.map((preview) => (
          <section key={preview.subject} style={{ background: '#fff', border: '1px solid #c9b37c' }}>
            <h2 style={{ fontFamily: 'Arial, sans-serif', margin: 16 }}>{preview.subject}</h2>
            <iframe
              title={preview.subject}
              srcDoc={preview.html}
              style={{ border: 0, height: 900, width: '100%' }}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
