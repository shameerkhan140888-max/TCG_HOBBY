import { notFound } from 'next/navigation';
import {
  buildIronSprueCancellationEmail,
  buildIronSprueDispatchEmail,
  buildIronSprueOrderConfirmationEmail,
  type IronSprueEmailOrder,
  type IronSprueEmailTemplateConfig,
} from '@tcg-hobby/database';

export const dynamic = 'force-dynamic';

const config: IronSprueEmailTemplateConfig = {
  siteUrl: process.env.NEXT_PUBLIC_IRON_SPRUE_SITE_URL ?? 'http://localhost:3004',
  supportEmail: process.env.IRON_SPRUE_SUPPORT_EMAIL ?? 'info@ironsprue.co.uk',
  logoUrl: process.env.IRON_SPRUE_EMAIL_LOGO_URL ?? null,
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

const previews = [
  buildIronSprueOrderConfirmationEmail(sampleOrder, config),
  buildIronSprueCancellationEmail(sampleOrder, config, { refunded: true }),
  buildIronSprueDispatchEmail(sampleOrder, config),
];

export default function IronSprueEmailPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

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
