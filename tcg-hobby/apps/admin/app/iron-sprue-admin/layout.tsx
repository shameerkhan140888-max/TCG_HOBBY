import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Iron Sprue Admin',
    template: '%s | Iron Sprue Admin',
  },
  description: 'Dedicated Iron Sprue administration workspace.',
  icons: {
    icon: '/brand/iron-sprue-favicon.svg',
    shortcut: '/brand/iron-sprue-favicon.svg',
    apple: '/brand/iron-sprue-favicon.svg',
  },
};

export default function IronSprueAdminRouteLayout({ children }: { children: ReactNode }) {
  return children;
}
