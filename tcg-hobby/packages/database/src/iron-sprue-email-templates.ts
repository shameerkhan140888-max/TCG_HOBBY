export type IronSprueEmailOrderItem = {
  productName: string;
  productSlug: string;
  productSku: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type IronSprueEmailOrder = {
  orderNumber: string;
  createdAt: Date;
  paidAt?: Date | null;
  dispatchedAt?: Date | null;
  paymentStatus: string;
  fulfilmentStatus: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  shippingMethodName?: string | null;
  shippingFullName?: string | null;
  shippingEmail?: string | null;
  shippingLine1?: string | null;
  shippingLine2?: string | null;
  shippingCity?: string | null;
  shippingRegion?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: IronSprueEmailOrderItem[];
};

export type IronSprueEmailTemplateConfig = {
  siteUrl: string;
  supportEmail: string;
  assetBaseUrl?: string | null;
  mediaBaseUrl?: string | null;
  logoUrl?: string | null;
};

export type IronSprueEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

type CancellationOptions = {
  refunded: boolean;
};

export type CustomerRequestEmailOptions = {
  requestType: 'CANCELLATION' | 'RETURN';
  reason?: string | null;
};

const brand = {
  name: 'Iron Sprue',
  accent: '#ff7a1a',
  gold: '#d4a247',
  graphite: '#080a09',
  surface: '#f8f9f6',
  ink: '#171717',
  muted: '#5f625d',
};

const IRON_SPRUE_MEDIA_HOST = 'media.ironsprue.co.uk';
const IRON_SPRUE_MEDIA_ROUTE_PREFIX = '/media/iron-sprue/';
const IRON_SPRUE_STAGING_HOST = 'staging.ironsprue.co.uk';
const IRON_SPRUE_STAGING_WORKER_ASSET_BASE_URL = 'https://iron-sprue-storefront-staging.shameerkhan140888.workers.dev';

function money(minor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100);
}

function dateTime(value?: Date | null) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(value ?? new Date());
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normaliseSiteUrl(siteUrl: string) {
  return (siteUrl || 'https://ironsprue.co.uk').replace(/\/$/, '');
}

function isLocalUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value);
}

export function defaultIronSprueEmailLogoUrl(siteUrl: string) {
  return `${normaliseSiteUrl(siteUrl)}/brand/iron-sprue-horizontal-email.png`;
}

function assetBaseUrl(config: IronSprueEmailTemplateConfig) {
  const resolved = normaliseSiteUrl(config.assetBaseUrl || config.siteUrl);
  return isLocalUrl(resolved) ? 'https://www.ironsprue.co.uk' : resolved;
}

function publicEmailAssetBaseUrl(config: IronSprueEmailTemplateConfig) {
  const resolved = assetBaseUrl(config);
  return publicEmailUrlBase(resolved);
}

function publicEmailLinkBaseUrl(config: IronSprueEmailTemplateConfig) {
  return publicEmailUrlBase(normaliseSiteUrl(config.siteUrl));
}

function publicEmailUrlBase(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === IRON_SPRUE_STAGING_HOST) {
      const suffix = parsed.pathname === '/' && !parsed.search ? '' : `${parsed.pathname}${parsed.search}`;
      return `${IRON_SPRUE_STAGING_WORKER_ASSET_BASE_URL}${suffix}`;
    }
    if (hostname === 'ironsprue.co.uk') return value.replace(/^https:\/\/ironsprue\.co\.uk(?=\/|$)/i, 'https://www.ironsprue.co.uk');
    return value;
  } catch {
    return value;
  }
}

function publicEmailMediaBaseUrl(config: IronSprueEmailTemplateConfig) {
  return normaliseSiteUrl(config.mediaBaseUrl || `https://${IRON_SPRUE_MEDIA_HOST}`);
}

function orderHref(order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) {
  return `${publicEmailLinkBaseUrl(config)}/account/orders/${encodeURIComponent(order.orderNumber)}`;
}

function shopHref(config: IronSprueEmailTemplateConfig) {
  return `${publicEmailLinkBaseUrl(config)}/shop`;
}

function productHref(item: IronSprueEmailOrderItem, config: IronSprueEmailTemplateConfig) {
  return `${publicEmailLinkBaseUrl(config)}/products/${encodeURIComponent(item.productSlug)}`;
}

function imageSrc(item: IronSprueEmailOrderItem, config: IronSprueEmailTemplateConfig) {
  if (!item.imageUrl) return null;
  if (item.imageUrl.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) {
    const key = item.imageUrl.slice(IRON_SPRUE_MEDIA_ROUTE_PREFIX.length);
    return key ? `${publicEmailMediaBaseUrl(config)}/${key}` : null;
  }
  try {
    const parsed = new URL(item.imageUrl);
    if (parsed.pathname.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) {
      const key = parsed.pathname.slice(IRON_SPRUE_MEDIA_ROUTE_PREFIX.length);
      return key ? `${publicEmailMediaBaseUrl(config)}/${key}${parsed.search}` : null;
    }
    if (parsed.hostname.toLowerCase() === IRON_SPRUE_MEDIA_HOST) {
      const key = parsed.pathname.replace(/^\/+/, '');
      return key ? `${publicEmailMediaBaseUrl(config)}/${key}` : null;
    }
  } catch {
    // Non-URL values fall through to the relative-path handling below.
  }
  if (/^https?:\/\//i.test(item.imageUrl)) return item.imageUrl;
  if (item.imageUrl.startsWith('/')) return `${publicEmailAssetBaseUrl(config)}${item.imageUrl}`;
  return null;
}

function addressLines(order: IronSprueEmailOrder) {
  return [
    order.shippingFullName,
    order.shippingLine1,
    order.shippingLine2,
    order.shippingCity,
    order.shippingRegion,
    order.shippingPostalCode,
    order.shippingCountry,
  ].filter(Boolean) as string[];
}

function validTrackingUrl(value?: string | null) {
  return value && /^https?:\/\//i.test(value) ? value : null;
}

function baseStyles() {
  return `
    body{margin:0;background:#eef2f0;color:${brand.ink};font-family:Arial,Helvetica,sans-serif;}
    .wrap{width:100%;background:#eef2f0;padding:24px 0;}
    .email{max-width:720px;margin:0 auto;background:${brand.surface};border:1px solid #d6ddda;}
    .header{background:${brand.graphite};color:#fff;padding:24px 28px;}
    .logo{display:block;max-width:220px;height:auto;margin-bottom:16px;}
    .wordmark{font-size:24px;letter-spacing:4px;text-transform:uppercase;font-weight:800;color:#fff;}
    .accent{color:${brand.accent};}
    .body{padding:28px;}
    h1{font-size:28px;line-height:1.15;margin:0 0 12px;font-weight:800;}
    h2{font-size:15px;letter-spacing:1.5px;text-transform:uppercase;margin:28px 0 12px;color:#9f762d;}
    p{font-size:15px;line-height:1.6;margin:0 0 12px;color:${brand.ink};}
    .muted{color:${brand.muted};}
    .panel{border:1px solid #d6ddda;background:#ffffff;padding:16px;margin:16px 0;}
    .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
    .meta div{border:1px solid #d6ddda;background:#fff;padding:12px;}
    .label{display:block;color:${brand.muted};font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
    .value{font-size:15px;font-weight:700;color:${brand.ink};}
    table{width:100%;border-collapse:collapse;}
    th{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${brand.muted};text-align:left;border-bottom:1px solid #d6ddda;padding:10px 0;}
    td{border-bottom:1px solid #dde3e0;padding:12px 0;vertical-align:top;font-size:14px;}
    .product{display:flex;gap:12px;align-items:center;}
    .thumb{width:72px;height:72px;border:1px solid #d6ddda;background:#fff;object-fit:contain;}
    .thumbFallback{width:72px;height:72px;border:1px solid #d6ddda;background:#fff;display:inline-flex;align-items:center;justify-content:center;color:${brand.muted};font-size:11px;text-align:center;}
    .right{text-align:right;}
    .totals{max-width:300px;margin-left:auto;}
    .totals td{padding:6px 0;border:0;}
    .total td{border-top:1px solid #d6ddda;padding-top:10px;font-size:18px;font-weight:800;}
    .button{display:inline-block;background:${brand.gold};color:#111!important;text-decoration:none;padding:13px 18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;}
    .footer{padding:20px 28px;background:${brand.graphite};color:#c9c2b7;font-size:12px;line-height:1.6;}
    .footer p{color:#c9c2b7;font-size:12px;margin:0 0 8px;}
    @media(max-width:620px){.body,.header,.footer{padding:20px}.meta{display:block}.meta div{margin-bottom:10px}.product{display:block}.thumb,.thumbFallback{margin-bottom:8px}.right{text-align:left}.totals{max-width:none;margin-left:0}}
  `;
}

function header(config: IronSprueEmailTemplateConfig, heading: string, copy: string) {
  const logoUrl = config.logoUrl && /^https?:\/\//i.test(config.logoUrl)
    ? publicEmailUrlBase(config.logoUrl)
    : null;
  const logo = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Iron Sprue" />`
    : '<div class="wordmark">IRON <span class="accent">SPRUE</span></div>';
  return `
    <div class="header">
      ${logo}
      <h1>${escapeHtml(heading)}</h1>
      <p style="color:#e8dfd0">${escapeHtml(copy)}</p>
    </div>
  `;
}

function orderMeta(order: IronSprueEmailOrder) {
  return `
    <div class="meta">
      <div><span class="label">Order number</span><span class="value">${escapeHtml(order.orderNumber)}</span></div>
      <div><span class="label">Order date</span><span class="value">${escapeHtml(dateTime(order.paidAt ?? order.createdAt))}</span></div>
      <div><span class="label">Payment status</span><span class="value">${escapeHtml(customerPaymentStatus(order.paymentStatus))}</span></div>
      <div><span class="label">Fulfilment status</span><span class="value">${escapeHtml(customerFulfilmentStatus(order.fulfilmentStatus))}</span></div>
    </div>
  `;
}

function customerPaymentStatus(status: string) {
  if (status === 'SUCCEEDED') return 'Paid';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'CANCELED') return 'Cancelled';
  return 'Pending';
}

function customerFulfilmentStatus(status: string) {
  if (status === 'SHIPPED') return 'Dispatched';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'PACKED') return 'Packed';
  if (status === 'PICKING') return 'Being prepared';
  return 'Pending';
}

function itemRows(order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) {
  return order.items.map((item) => {
    const src = imageSrc(item, config);
    const image = src
      ? `<img class="thumb" src="${escapeHtml(src)}" alt="${escapeHtml(item.imageAlt ?? item.productName)}" />`
      : '<span class="thumbFallback">Iron Sprue</span>';
    return `
      <tr>
        <td>
          <div class="product">
            <a href="${escapeHtml(productHref(item, config))}">${image}</a>
            <div>
              <strong>${escapeHtml(item.productName)}</strong><br />
              <span class="muted">SKU ${escapeHtml(item.productSku)}</span>
            </div>
          </div>
        </td>
        <td class="right">${escapeHtml(String(item.quantity))}</td>
        <td class="right">${escapeHtml(money(item.unitPriceMinor, order.currency))}</td>
        <td class="right">${escapeHtml(money(item.totalMinor, order.currency))}</td>
      </tr>
    `;
  }).join('');
}

function itemsTable(order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) {
  return `
    <h2>Items</h2>
    <table role="presentation">
      <thead><tr><th>Product</th><th class="right">Qty</th><th class="right">Each</th><th class="right">Total</th></tr></thead>
      <tbody>${itemRows(order, config)}</tbody>
    </table>
  `;
}

function totals(order: IronSprueEmailOrder, label = 'Total paid') {
  return `
    <table class="totals" role="presentation">
      <tr><td>Subtotal</td><td class="right">${escapeHtml(money(order.subtotalMinor, order.currency))}</td></tr>
      <tr><td>Delivery</td><td class="right">${escapeHtml(money(order.shippingMinor, order.currency))}</td></tr>
      <tr><td>VAT included</td><td class="right">${escapeHtml(money(order.taxMinor, order.currency))}</td></tr>
      <tr class="total"><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(money(order.totalMinor, order.currency))}</td></tr>
    </table>
  `;
}

function delivery(order: IronSprueEmailOrder) {
  const lines = addressLines(order).map((line) => escapeHtml(line)).join('<br />');
  return `
    <h2>Delivery</h2>
    <div class="panel">
      <p>${lines || 'Delivery details will be shown on your order.'}</p>
      ${order.shippingMethodName ? `<p class="muted">${escapeHtml(order.shippingMethodName)}</p>` : ''}
    </div>
  `;
}

function footer(config: IronSprueEmailTemplateConfig) {
  return `
    <div class="footer">
      <p><strong>Capital Hobby Group Ltd</strong>, trading as Iron Sprue.</p>
      <p>Company number 17336948. VAT No. 525 2040 33. Registered office: 4-6 Greatorex Street, London, United Kingdom, E1 5NF.</p>
      <p>Need help? Contact ${escapeHtml(config.supportEmail)}.</p>
    </div>
  `;
}

function wrap(content: string) {
  return `<!doctype html><html><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><style>${baseStyles()}</style></head><body><div class="wrap"><div class="email">${content}</div></div></body></html>`;
}

function textOrderLines(order: IronSprueEmailOrder) {
  return order.items
    .map((item) => `- ${item.productName} (${item.productSku}) x ${item.quantity}: ${money(item.totalMinor, order.currency)}`)
    .join('\n');
}

function textAddress(order: IronSprueEmailOrder) {
  return addressLines(order).join(', ');
}

export function buildIronSprueOrderConfirmationEmail(
  order: IronSprueEmailOrder,
  config: IronSprueEmailTemplateConfig,
): IronSprueEmailTemplate {
  const subject = `Order confirmed - ${order.orderNumber}`;
  const html = wrap(`
    ${header(config, 'Order confirmed', 'Thank you for your order. We have received your payment and your order is now being prepared.')}
    <div class="body">
      ${orderMeta(order)}
      ${itemsTable(order, config)}
      <h2>Order summary</h2>
      ${totals(order)}
      ${delivery(order)}
      <h2>What happens next</h2>
      <p>We will prepare your order for dispatch and send another email when it is on its way.</p>
      <p><a class="button" href="${escapeHtml(shopHref(config))}">Shop more kits</a></p>
    </div>
    ${footer(config)}
  `);
  const text = [
    `Order confirmed - ${order.orderNumber}`,
    '',
    'Thank you for your order. We have received your payment and your order is now being prepared.',
    '',
    textOrderLines(order),
    '',
    `Subtotal: ${money(order.subtotalMinor, order.currency)}`,
    `Delivery: ${money(order.shippingMinor, order.currency)}`,
    `Total paid: ${money(order.totalMinor, order.currency)}`,
    '',
    `Delivery: ${textAddress(order)}`,
    order.shippingMethodName ? `Delivery method: ${order.shippingMethodName}` : '',
    '',
    `Shop more kits: ${shopHref(config)}`,
  ].filter(Boolean).join('\n');
  return { subject, html, text };
}

export function buildIronSprueCancellationEmail(
  order: IronSprueEmailOrder,
  config: IronSprueEmailTemplateConfig,
  options: CancellationOptions,
): IronSprueEmailTemplate {
  const subject = options.refunded
    ? `Order cancelled and refunded - ${order.orderNumber}`
    : `Order cancelled - ${order.orderNumber}`;
  const intro = options.refunded
    ? 'Your order has been cancelled and the refund has been processed from our side. Your card or bank provider may take additional time to show the funds.'
    : 'Your order has been cancelled. No payment was taken for this order.';
  const html = wrap(`
    ${header(config, options.refunded ? 'Order cancelled and refunded' : 'Order cancelled', intro)}
    <div class="body">
      ${orderMeta(order)}
      ${itemsTable(order, config)}
      <h2>${options.refunded ? 'Refund summary' : 'Order summary'}</h2>
      ${options.refunded ? totals(order, 'Refund amount') : totals(order, 'Order total')}
      ${delivery(order)}
      <p><a class="button" href="${escapeHtml(shopHref(config))}">Visit Iron Sprue</a></p>
    </div>
    ${footer(config)}
  `);
  const text = [
    subject,
    '',
    intro,
    '',
    textOrderLines(order),
    '',
    options.refunded ? `Refund amount: ${money(order.totalMinor, order.currency)}` : `Order total: ${money(order.totalMinor, order.currency)}`,
    '',
    `Visit Iron Sprue: ${shopHref(config)}`,
  ].join('\n');
  return { subject, html, text };
}

export function buildIronSprueDispatchEmail(
  order: IronSprueEmailOrder,
  config: IronSprueEmailTemplateConfig,
): IronSprueEmailTemplate {
  const subject = `Your Iron Sprue order is on its way - ${order.orderNumber}`;
  const trackingUrl = validTrackingUrl(order.trackingUrl);
  const html = wrap(`
    ${header(config, 'Your order has been dispatched', 'Your Iron Sprue order is now on its way.')}
    <div class="body">
      ${orderMeta(order)}
      <div class="panel">
        <p><span class="label">Dispatched</span><span class="value">${escapeHtml(dateTime(order.dispatchedAt ?? new Date()))}</span></p>
        ${order.trackingCarrier ? `<p><span class="label">Courier</span><span class="value">${escapeHtml(order.trackingCarrier)}</span></p>` : ''}
        ${order.trackingNumber ? `<p><span class="label">Tracking number</span><span class="value">${escapeHtml(order.trackingNumber)}</span></p>` : ''}
        ${trackingUrl ? `<p><a class="button" href="${escapeHtml(trackingUrl)}">Track your order</a></p>` : ''}
      </div>
      ${itemsTable(order, config)}
      ${delivery(order)}
    </div>
    ${footer(config)}
  `);
  const text = [
    subject,
    '',
    'Your Iron Sprue order is now on its way.',
    `Dispatched: ${dateTime(order.dispatchedAt ?? new Date())}`,
    order.trackingCarrier ? `Courier: ${order.trackingCarrier}` : '',
    order.trackingNumber ? `Tracking number: ${order.trackingNumber}` : '',
    trackingUrl ? `Track your order: ${trackingUrl}` : '',
    '',
    textOrderLines(order),
  ].filter(Boolean).join('\n');
  return { subject, html, text };
}

export function buildIronSprueCustomerRequestEmail(
  order: IronSprueEmailOrder,
  config: IronSprueEmailTemplateConfig,
  options: CustomerRequestEmailOptions,
): IronSprueEmailTemplate {
  const isReturn = options.requestType === 'RETURN';
  const label = isReturn ? 'return request' : 'cancellation request';
  const heading = isReturn ? 'Return request received' : 'Cancellation request received';
  const subject = `${heading} - ${order.orderNumber}`;
  const intro = `We have received your ${label}. The Iron Sprue team will review it and contact you if we need anything else.`;
  const reason = options.reason?.trim();
  const html = wrap(`
    ${header(config, heading, intro)}
    <div class="body">
      ${orderMeta(order)}
      <div class="panel">
        <p><span class="label">Request</span><span class="value">${escapeHtml(isReturn ? 'Return' : 'Cancellation')}</span></p>
        ${reason ? `<p><span class="label">Reason</span><span class="value">${escapeHtml(reason)}</span></p>` : ''}
      </div>
      ${itemsTable(order, config)}
      <h2>What happens next</h2>
      <p>We will review your order and reply with the next steps. Please do not send any item back until we confirm the return instructions.</p>
      <p><a class="button" href="${escapeHtml(orderHref(order, config))}">View order</a></p>
    </div>
    ${footer(config)}
  `);
  const text = [
    `${heading} - ${order.orderNumber}`,
    '',
    intro,
    reason ? `Reason: ${reason}` : '',
    '',
    textOrderLines(order),
    '',
    'We will review your order and reply with the next steps. Please do not send any item back until we confirm the return instructions.',
    '',
    `View order: ${orderHref(order, config)}`,
  ].filter(Boolean).join('\n');
  return { subject, html, text };
}
