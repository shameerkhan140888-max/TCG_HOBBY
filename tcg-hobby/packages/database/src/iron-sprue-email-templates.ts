export type IronSprueEmailOrderItem = {
  productName: string;
  productSlug: string;
  productSku: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  imageUrl?: string | null;
  imageAlt?: string | null;
  inlineImageCid?: string | null;
  inlineImageSourceUrl?: string | null;
  inlineImageFilename?: string | null;
  inlineImageContentType?: string | null;
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
  returns?: Array<{
    restock?: boolean | null;
    lines?: Array<{
      quantity: number;
      restock?: boolean | null;
    }>;
  }>;
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
  attachments?: IronSprueEmailAttachment[];
};

export type IronSprueEmailAttachment = {
  path: string;
  filename: string;
  content_id: string;
  content_type?: string;
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
const IRON_SPRUE_EMAIL_LOGO_PATH = '/brand/iron-sprue-horizontal-email.png';
const IRON_SPRUE_EMAIL_IMAGE_VERSION = '20260927-live-domain-v2';

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
  return `${publicEmailUrlBase(normaliseSiteUrl(siteUrl))}${IRON_SPRUE_EMAIL_LOGO_PATH}`;
}

function isIconOnlyIronSprueAsset(value: string) {
  return /(?:iron-sprue-email-avatar|favicon|apple-icon|\/icon\.)/i.test(value);
}

function assetBaseUrl(config: IronSprueEmailTemplateConfig) {
  const resolved = normaliseSiteUrl(config.assetBaseUrl || config.siteUrl);
  return isLocalUrl(resolved) ? 'https://ironsprue.co.uk' : resolved;
}

function publicEmailAssetBaseUrl(config: IronSprueEmailTemplateConfig) {
  const resolved = assetBaseUrl(config);
  return publicEmailUrlBase(resolved);
}

function publicEmailLinkBaseUrl(config: IronSprueEmailTemplateConfig) {
  return publicEmailUrlBase(normaliseSiteUrl(config.siteUrl));
}

function publicEmailMediaRouteBaseUrl(config: IronSprueEmailTemplateConfig) {
  const resolved = publicEmailLinkBaseUrl(config);
  return isLocalUrl(resolved) ? 'https://ironsprue.co.uk' : resolved;
}

function publicEmailUrlBase(value: string) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === IRON_SPRUE_STAGING_HOST) {
      const suffix = parsed.pathname === '/' && !parsed.search ? '' : `${parsed.pathname}${parsed.search}`;
      return `${IRON_SPRUE_STAGING_WORKER_ASSET_BASE_URL}${suffix}`;
    }
    if (hostname === 'www.ironsprue.co.uk') {
      parsed.hostname = 'ironsprue.co.uk';
      return parsed.toString().replace(/\/$/, '');
    }
    return value;
  } catch {
    return value;
  }
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

export function resolveIronSprueEmailImageSrc(item: IronSprueEmailOrderItem, config: IronSprueEmailTemplateConfig) {
  if (item.inlineImageCid) return `cid:${item.inlineImageCid}`;

  const mediaImageUrl = (key: string, search = '') => {
    const base = `${publicEmailMediaRouteBaseUrl(config)}${IRON_SPRUE_MEDIA_ROUTE_PREFIX}${key}`;
    const params = new URLSearchParams(search.replace(/^\?/, ''));
    params.set('emailImage', IRON_SPRUE_EMAIL_IMAGE_VERSION);
    return `${base}?${params.toString()}`;
  };

  if (!item.imageUrl) return null;
  if (item.imageUrl.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) {
    const key = item.imageUrl.slice(IRON_SPRUE_MEDIA_ROUTE_PREFIX.length);
    return key ? mediaImageUrl(key) : null;
  }
  try {
    const parsed = new URL(item.imageUrl);
    if (parsed.pathname.startsWith(IRON_SPRUE_MEDIA_ROUTE_PREFIX)) {
      const key = parsed.pathname.slice(IRON_SPRUE_MEDIA_ROUTE_PREFIX.length);
      return key ? mediaImageUrl(key, parsed.search) : null;
    }
    if (parsed.hostname.toLowerCase() === IRON_SPRUE_MEDIA_HOST) {
      const key = parsed.pathname.replace(/^\/+/, '');
      return key ? mediaImageUrl(key) : null;
    }
  } catch {
    // Non-URL values fall through to the relative-path handling below.
  }
  if (/^https?:\/\//i.test(item.imageUrl)) return item.imageUrl;
  if (item.imageUrl.startsWith('/')) return `${publicEmailAssetBaseUrl(config)}${item.imageUrl}`;
  return null;
}

function productImageAttachments(order: IronSprueEmailOrder): IronSprueEmailAttachment[] {
  const seen = new Set<string>();
  const attachments: IronSprueEmailAttachment[] = [];
  for (const item of order.items) {
    const sourceUrl = item.inlineImageSourceUrl?.trim();
    const contentId = item.inlineImageCid?.trim();
    if (!sourceUrl || !contentId || seen.has(contentId)) continue;
    seen.add(contentId);
    const attachment: IronSprueEmailAttachment = {
      path: sourceUrl,
      filename: item.inlineImageFilename?.trim() || `${contentId}.jpg`,
      content_id: contentId,
    };
    const contentType = item.inlineImageContentType?.trim();
    if (contentType) attachment.content_type = contentType;
    attachments.push(attachment);
  }
  return attachments;
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
    .logo{display:block;width:260px;max-width:100%;height:auto;margin-bottom:16px;}
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
    .itemCard{margin:0 0 14px;border-bottom:1px solid #dde3e0;}
    .itemProductCell{padding:14px 0 10px;border:0;}
    .itemMeasureCell{padding:8px 0 14px;border:0;}
    .itemMeasure{border-collapse:collapse;width:auto;}
    .itemMeasure td{border:0;padding:0 24px 0 0;vertical-align:top;white-space:nowrap;}
    .itemMeasureLabel{display:block;color:${brand.muted};font-size:11px;line-height:1.2;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;white-space:nowrap;}
    .itemMeasureValue{display:block;color:${brand.ink};font-size:15px;line-height:1.25;font-weight:700;white-space:nowrap;}
    th{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${brand.muted};text-align:left;border-bottom:1px solid #d6ddda;padding:10px 0;}
    td{border-bottom:1px solid #dde3e0;padding:14px 0;vertical-align:top;font-size:14px;}
    .productTable{border-collapse:collapse;width:100%;}
    .productTable td{border:0;padding:0;vertical-align:middle;}
    .thumbCell{width:88px;padding-right:14px!important;}
    .thumb{display:block;width:72px;height:72px;border:1px solid #d6ddda;background:#fff;object-fit:contain;}
    .thumbFallback{display:block;width:72px;height:72px;border:1px solid #d6ddda;background:#fff;color:${brand.muted};font-size:11px;line-height:72px;text-align:center;}
    .right{text-align:right;padding-left:14px;}
    .totals{max-width:300px;margin-left:auto;}
    .totals td{padding:6px 0;border:0;}
    .total td{border-top:1px solid #d6ddda;padding-top:10px;font-size:18px;font-weight:800;}
    .button{display:inline-block;background:${brand.gold};color:#111!important;text-decoration:none;padding:13px 18px;font-weight:800;letter-spacing:1px;text-transform:uppercase;}
    .footer{padding:20px 28px;background:${brand.graphite};color:#c9c2b7;font-size:12px;line-height:1.6;}
    .footer p{color:#c9c2b7;font-size:12px;margin:0 0 8px;}
    @media(max-width:620px){.body,.header,.footer{padding:20px}.meta{display:block}.meta div{margin-bottom:10px}.totals{max-width:none;margin-left:0}}
  `;
}

function header(config: IronSprueEmailTemplateConfig, heading: string, copy: string) {
  const requestedLogoUrl = config.logoUrl && /^https?:\/\//i.test(config.logoUrl)
    ? config.logoUrl
    : null;
  const logoUrl = requestedLogoUrl && !isIconOnlyIronSprueAsset(requestedLogoUrl)
    ? publicEmailUrlBase(requestedLogoUrl)
    : defaultIronSprueEmailLogoUrl(config.assetBaseUrl || config.siteUrl);
  const logo = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" width="260" alt="Iron Sprue" style="display:block;width:260px;max-width:100%;height:auto;margin-bottom:16px;border:0;" />`
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
  if (status === 'RETURNED') return 'Returned';
  if (status === 'REFUNDED') return 'Refunded';
  if (status === 'SHIPPED') return 'Dispatched';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'PACKED') return 'Packed';
  if (status === 'PICKING') return 'Being prepared';
  return 'Pending';
}

function itemRows(order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) {
  return order.items.map((item) => {
    const src = resolveIronSprueEmailImageSrc(item, config);
    const image = src
      ? `<img class="thumb" src="${escapeHtml(src)}" width="72" height="72" alt="" role="presentation" style="display:block;width:72px;height:72px;object-fit:contain;border:1px solid #d6ddda;background:#fff;" />`
      : '<span class="thumbFallback">Iron Sprue</span>';
    return `
      <tr><td class="itemProductCell">
        <table class="productTable" role="presentation">
          <tr>
            <td class="thumbCell" width="88">${image}</td>
            <td>
              <a href="${escapeHtml(productHref(item, config))}" style="color:${brand.ink};text-decoration:none;"><strong>${escapeHtml(item.productName)}</strong></a><br />
              <span class="muted">SKU ${escapeHtml(item.productSku)}</span>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr>
        <td class="itemMeasureCell">
          <table class="itemMeasure" role="presentation">
            <tr>
              <td><span class="itemMeasureLabel">Qty</span><span class="itemMeasureValue">${escapeHtml(String(item.quantity))}</span></td>
              <td><span class="itemMeasureLabel">Each</span><span class="itemMeasureValue">${escapeHtml(money(item.unitPriceMinor, order.currency))}</span></td>
              <td><span class="itemMeasureLabel">Total</span><span class="itemMeasureValue">${escapeHtml(money(item.totalMinor, order.currency))}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');
}

function itemsTable(order: IronSprueEmailOrder, config: IronSprueEmailTemplateConfig) {
  return `
    <h2>Items</h2>
    <table class="itemCard" role="presentation">
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
      <p>Company number 17336948. VAT No. GB525204033. Registered office: 4-6 Greatorex Street, London, United Kingdom, E1 5NF.</p>
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

function hasRestockedReturn(order: IronSprueEmailOrder) {
  return order.returns?.some((returnRecord) => (
    Boolean(returnRecord.restock)
    || returnRecord.lines?.some((line) => line.restock && line.quantity > 0)
  )) ?? false;
}

function wasDispatched(order: IronSprueEmailOrder) {
  return Boolean(order.dispatchedAt || order.trackingCarrier || order.trackingNumber || order.trackingUrl)
    || ['SHIPPED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.fulfilmentStatus);
}

function cancellationFulfilmentStatus(order: IronSprueEmailOrder, options: CancellationOptions) {
  if (options.refunded || order.paymentStatus === 'REFUNDED') {
    if (hasRestockedReturn(order)) return 'RETURNED';
    if (wasDispatched(order)) return 'REFUNDED';
  }
  return 'CANCELLED';
}

export function buildIronSprueOrderConfirmationEmail(
  order: IronSprueEmailOrder,
  config: IronSprueEmailTemplateConfig,
): IronSprueEmailTemplate {
  const subject = `Order confirmed - ${order.orderNumber}`;
  const html = wrap(`
    ${header(config, 'Order confirmed', 'Thank you for your order. We have received your payment and accepted your order for fulfilment.')}
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
    'Thank you for your order. We have received your payment and accepted your order for fulfilment.',
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
  return { subject, html, text, attachments: productImageAttachments(order) };
}

export function buildIronSprueCancellationEmail(
  order: IronSprueEmailOrder,
  config: IronSprueEmailTemplateConfig,
  options: CancellationOptions,
): IronSprueEmailTemplate {
  const cancellationEmailOrder = { ...order, fulfilmentStatus: cancellationFulfilmentStatus(order, options) };
  const subject = options.refunded
    ? `Order cancelled and refunded - ${order.orderNumber}`
    : `Order cancelled - ${order.orderNumber}`;
  const intro = options.refunded
    ? 'Your order has been cancelled and the refund has been processed from our side. Your card or bank provider may take additional time to show the funds.'
    : 'Your order has been cancelled. No payment was taken for this order.';
  const html = wrap(`
    ${header(config, options.refunded ? 'Order cancelled and refunded' : 'Order cancelled', intro)}
    <div class="body">
      ${orderMeta(cancellationEmailOrder)}
      ${itemsTable(cancellationEmailOrder, config)}
      <h2>${options.refunded ? 'Refund summary' : 'Order summary'}</h2>
      ${options.refunded ? totals(cancellationEmailOrder, 'Refund amount') : totals(cancellationEmailOrder, 'Order total')}
      ${delivery(cancellationEmailOrder)}
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
  return { subject, html, text, attachments: productImageAttachments(cancellationEmailOrder) };
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
  return { subject, html, text, attachments: productImageAttachments(order) };
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
  return { subject, html, text, attachments: productImageAttachments(order) };
}
