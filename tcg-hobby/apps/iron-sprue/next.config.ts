import type { NextConfig } from 'next';

const developmentScriptPolicy = process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'";
const railwayProductionApiOrigin = 'https://considerate-unity-production-b734.up.railway.app';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'${developmentScriptPolicy} https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; font-src 'self'; connect-src 'self' ${railwayProductionApiOrigin} https://api.stripe.com https://r.stripe.com https://m.stripe.network https://q.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
