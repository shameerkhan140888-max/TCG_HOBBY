import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TCG Hobby',
  description: 'Premium trading card game commerce platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
