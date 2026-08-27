import type { OrderWithItems } from '@capital-hobby/database/storefront';

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

type EmailShellInput = {
  siteUrl: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  content: string;
  footerNote: string;
};

const DEFAULT_EMAIL_ASSET_BASE_URL = 'https://www.tcg-hobby.co.uk';
const EMAIL_LOGO_PATH = '/brand/tcg-hobby-horizontal-dark.png';
const EMAIL_LOGO_WIDTH = 168;
const EMAIL_LOGO_HEIGHT = 54;

export function escapeEmailHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteMediaUrl(value: string | null | undefined, siteUrl: string) {
  if (!value) return null;
  try {
    return new URL(value, `${siteUrl}/`).toString();
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  return lower === 'localhost' || lower === '127.0.0.1' || lower === '::1';
}

function normalizeEmailAssetBaseUrl(value: string | null | undefined, source: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLocal = isLocalHostname(url.hostname);
    const isHttps = url.protocol === 'https:';

    if (process.env.NODE_ENV === 'production' && (!isHttps || isLocal)) {
      throw new Error(`${source} must be a public HTTPS URL for transactional email assets.`);
    }

    if (!isHttps || isLocal) return null;

    if (url.hostname.toLowerCase() === 'tcg-hobby.co.uk') {
      url.hostname = 'www.tcg-hobby.co.uk';
    }

    return url.toString().replace(/\/$/, '');
  } catch (error) {
    if (process.env.NODE_ENV === 'production' && error instanceof Error) {
      throw error;
    }

    return null;
  }
}

export function getTransactionalEmailLogoUrl(siteUrl: string) {
  const candidates: Array<[source: string, value: string | undefined]> = [
    ['TCG_HOBBY_EMAIL_ASSET_BASE_URL', process.env.TCG_HOBBY_EMAIL_ASSET_BASE_URL],
    ['EMAIL_ASSET_BASE_URL', process.env.EMAIL_ASSET_BASE_URL],
    ['PUBLIC_STOREFRONT_URL', process.env.PUBLIC_STOREFRONT_URL],
    ['NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL],
    ['siteUrl', siteUrl],
    ['default', DEFAULT_EMAIL_ASSET_BASE_URL],
  ];
  const baseUrl = candidates
    .map(([source, value]) => normalizeEmailAssetBaseUrl(value, source))
    .find((value): value is string => Boolean(value));

  return `${baseUrl ?? DEFAULT_EMAIL_ASSET_BASE_URL}${EMAIL_LOGO_PATH}`;
}

function emailShell(input: EmailShellInput) {
  const logoUrl = getTransactionalEmailLogoUrl(input.siteUrl);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeEmailHtml(input.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#08080a;color:#17171b;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeEmailHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#08080a">
      <tr>
        <td align="center" style="padding:24px 12px">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse">
            <tr>
              <td style="padding:22px 24px;background:#111115;border-top:3px solid #ff7a1a">
                <img src="${logoUrl}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" alt="TCG Hobby" style="display:block;width:${EMAIL_LOGO_WIDTH}px;max-width:100%;height:auto;border:0">
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;background:#ffffff">
                <p style="margin:0 0 8px;color:#c65300;font-size:12px;font-weight:700;line-height:1.4;text-transform:uppercase;letter-spacing:1px">${escapeEmailHtml(input.eyebrow)}</p>
                <h1 style="margin:0 0 22px;color:#17171b;font-size:28px;line-height:1.2">${escapeEmailHtml(input.heading)}</h1>
                ${input.content}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;background:#111115;color:#a3a3a3;font-size:12px;line-height:1.65;border-top:1px solid #2d2d33">
                <p style="margin:0 0 6px;color:#f5f5f5;font-weight:700">Capital Hobby Group Ltd trading as TCG Hobby</p>
                <p style="margin:0 0 6px">Registered in England and Wales. Company number 17336948. VAT No. 525 2040 33.</p>
                <p style="margin:0">${escapeEmailHtml(input.footerNote)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function formatMoney(amountMinor: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amountMinor / 100);
}

export function buildSignupEmail(input: {
  email: string;
  firstName: string | null;
  unsubscribeToken: string;
  siteUrl: string;
}): RenderedEmail {
  const greeting = input.firstName?.trim() ? `Hi ${input.firstName.trim()},` : 'Hi there,';
  const unsubscribeUrl = `${input.siteUrl}/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}`;
  const content = `
    <p style="margin:0 0 16px;color:#303038;font-size:16px;line-height:1.65">${escapeEmailHtml(greeting)}</p>
    <p style="margin:0 0 16px;color:#303038;font-size:16px;line-height:1.65">Thanks for signing up. You will be among the first to hear about new stock, upcoming releases, launch updates and selected offers.</p>
    <p style="margin:0 0 22px;color:#303038;font-size:16px;line-height:1.65">We are building TCG Hobby for collectors and players who want clear product information, dependable service and a growing range of trading-card products and accessories.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 24px">
      <tr><td style="background:#ff7a1a"><a href="${input.siteUrl}" style="display:inline-block;padding:13px 20px;color:#111115;font-size:15px;font-weight:700;text-decoration:none">Visit TCG Hobby</a></td></tr>
    </table>
    <p style="margin:0 0 8px;color:#303038;font-size:16px;line-height:1.65">Thank you for being here from the beginning.</p>
    <p style="margin:0 0 22px;color:#303038;font-size:16px;line-height:1.65">The TCG Hobby Team</p>
    <p style="margin:0;color:#686872;font-size:12px;line-height:1.6">This email was sent because you signed up through the TCG Hobby website. <a href="${unsubscribeUrl}" style="color:#b34a00;text-decoration:underline">Unsubscribe at any time</a> or contact <a href="mailto:info@tcg-hobby.co.uk" style="color:#b34a00;text-decoration:underline">info@tcg-hobby.co.uk</a>.</p>`;

  const text = [
    greeting,
    '',
    'Welcome to TCG Hobby',
    '',
    'Thanks for signing up. You will be among the first to hear about new stock, upcoming releases, launch updates and selected offers.',
    '',
    'We are building TCG Hobby for collectors and players who want clear product information, dependable service and a growing range of trading-card products and accessories.',
    '',
    `Visit TCG Hobby: ${input.siteUrl}`,
    '',
    'Thank you for being here from the beginning.',
    'The TCG Hobby Team',
    '',
    'Capital Hobby Group Ltd trading as TCG Hobby',
    'Registered in England and Wales. Company number 17336948. VAT No. 525 2040 33.',
    'This email was sent because you signed up through the TCG Hobby website.',
    'Contact: info@tcg-hobby.co.uk',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return {
    subject: 'Welcome to TCG Hobby',
    text,
    html: emailShell({
      siteUrl: input.siteUrl,
      preheader: 'Thanks for joining TCG Hobby.',
      eyebrow: 'Welcome',
      heading: 'Welcome to TCG Hobby',
      content,
      footerNote: 'You are receiving this email because you signed up through the TCG Hobby website.',
    }),
  };
}

export function buildOrderConfirmationEmail(order: OrderWithItems, siteUrl: string): RenderedEmail {
  const itemRows = order.items.map((item) => {
    const imageUrl = absoluteMediaUrl(item.imageUrl, siteUrl);
    const image = imageUrl
      ? `<img src="${imageUrl}" width="72" height="72" alt="${escapeEmailHtml(item.imageAlt ?? item.productName)}" style="display:block;width:72px;height:72px;object-fit:contain;border:0">`
      : '<span style="display:block;width:72px;color:#686872;font-size:11px;line-height:1.3;text-align:center">Product image unavailable</span>';
    return `<tr>
      <td width="88" valign="top" style="padding:14px 12px 14px 0;border-top:1px solid #e5e5e8">
        <table role="presentation" width="72" height="72" cellpadding="0" cellspacing="0" style="width:72px;height:72px;border-collapse:collapse;background:#ffffff;border:1px solid #e5e5e8"><tr><td align="center" valign="middle">${image}</td></tr></table>
      </td>
      <td valign="top" style="padding:14px 8px;border-top:1px solid #e5e5e8;color:#303038;font-size:14px;line-height:1.5">
        <strong style="color:#17171b">${escapeEmailHtml(item.productName)}</strong><br>
        Quantity ${item.quantity}<br>
        ${formatMoney(item.unitPriceMinor, order.currency)} each
      </td>
      <td valign="top" align="right" style="padding:14px 0 14px 8px;border-top:1px solid #e5e5e8;color:#17171b;font-size:14px;font-weight:700;white-space:nowrap">${formatMoney(item.totalMinor, order.currency)}</td>
    </tr>`;
  }).join('');

  const address = order.shippingAddress ?? {
    fullName: order.shippingFullName,
    email: order.shippingEmail,
    line1: order.shippingLine1,
    line2: order.shippingLine2,
    city: order.shippingCity,
    region: order.shippingRegion,
    postalCode: order.shippingPostalCode,
    country: order.shippingCountry,
  };
  const addressLines = [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.region].filter(Boolean).join(', '),
    [address.postalCode, address.country].filter(Boolean).join(' '),
  ].filter((line): line is string => Boolean(line));
  const accountLink = order.userId
    ? `<p style="margin:24px 0 0"><a href="${siteUrl}/account/orders/${encodeURIComponent(order.orderNumber)}" style="display:inline-block;padding:13px 20px;background:#ff7a1a;color:#111115;font-size:15px;font-weight:700;text-decoration:none">View order details</a></p>`
    : '';
  const content = `
    <p style="margin:0 0 18px;color:#303038;font-size:16px;line-height:1.65">Thanks for your order. Your payment has been received and we are now preparing your items.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px">
      <tr><td style="padding:12px;background:#f4f4f6;color:#686872;font-size:13px">Order reference<br><strong style="color:#17171b;font-size:16px">${escapeEmailHtml(order.orderNumber)}</strong></td><td align="right" style="padding:12px;background:#f4f4f6;color:#686872;font-size:13px">Payment status<br><strong style="color:#137044;font-size:16px">Paid</strong></td></tr>
      <tr><td colspan="2" style="padding:8px 12px;background:#f4f4f6;color:#686872;font-size:13px">Order date: ${escapeEmailHtml(order.createdAt.toLocaleDateString('en-GB'))}</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${itemRows}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:22px 0">
      <tr><td style="padding:5px 0;color:#686872;font-size:14px">Subtotal</td><td align="right" style="padding:5px 0;color:#17171b;font-size:14px">${formatMoney(order.subtotalMinor, order.currency)}</td></tr>
      <tr><td style="padding:5px 0;color:#686872;font-size:14px">${escapeEmailHtml(order.shippingMethodName)}</td><td align="right" style="padding:5px 0;color:#17171b;font-size:14px">${order.shippingMinor === 0 ? 'Free' : formatMoney(order.shippingMinor, order.currency)}</td></tr>
      <tr><td style="padding:10px 0 5px;border-top:1px solid #d3d3d8;color:#17171b;font-size:16px;font-weight:700">Total paid</td><td align="right" style="padding:10px 0 5px;border-top:1px solid #d3d3d8;color:#17171b;font-size:18px;font-weight:700">${formatMoney(order.totalMinor, order.currency)}</td></tr>
    </table>
    <h2 style="margin:24px 0 8px;color:#17171b;font-size:18px">Delivery address</h2>
    <p style="margin:0;color:#303038;font-size:14px;line-height:1.6">${addressLines.map(escapeEmailHtml).join('<br>')}</p>
    ${accountLink}
    <p style="margin:24px 0 0;color:#686872;font-size:12px;line-height:1.6">Need help? Contact <a href="mailto:support@tcg-hobby.co.uk" style="color:#b34a00;text-decoration:underline">support@tcg-hobby.co.uk</a>.</p>`;

  const textItems = order.items.flatMap((item) => [
    `${item.productName}`,
    `Quantity: ${item.quantity}`,
    `Unit price: ${formatMoney(item.unitPriceMinor, order.currency)}`,
    `Line total: ${formatMoney(item.totalMinor, order.currency)}`,
    '',
  ]);
  const text = [
    'Your TCG Hobby order is confirmed',
    '',
    'Thanks for your order. Your payment has been received and we are now preparing your items.',
    '',
    `Order reference: ${order.orderNumber}`,
    `Order date: ${order.createdAt.toLocaleDateString('en-GB')}`,
    'Payment status: Paid',
    '',
    ...textItems,
    `Subtotal: ${formatMoney(order.subtotalMinor, order.currency)}`,
    `${order.shippingMethodName}: ${order.shippingMinor === 0 ? 'Free' : formatMoney(order.shippingMinor, order.currency)}`,
    `Total paid: ${formatMoney(order.totalMinor, order.currency)}`,
    '',
    'Delivery address:',
    ...addressLines,
    ...(order.userId ? ['', `View order details: ${siteUrl}/account/orders/${encodeURIComponent(order.orderNumber)}`] : []),
    '',
    'Support: support@tcg-hobby.co.uk',
    '',
    'Capital Hobby Group Ltd trading as TCG Hobby',
    'Registered in England and Wales. Company number 17336948. VAT No. 525 2040 33.',
  ].join('\n');

  return {
    subject: `Order confirmed - TCG Hobby order #${order.orderNumber}`,
    text,
    html: emailShell({
      siteUrl,
      preheader: 'Your payment has been received and your TCG Hobby order is confirmed.',
      eyebrow: `Order ${order.orderNumber}`,
      heading: 'Your TCG Hobby order is confirmed',
      content,
      footerNote: 'This transactional email was sent because an order was placed with TCG Hobby.',
    }),
  };
}
