import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import { corporateConfig } from "../lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(corporateConfig.siteUrl),
  title: {
    default: "Capital Hobby Group Ltd | Specialist Hobby Retail Brands",
    template: "%s | Capital Hobby Group Ltd",
  },
  description:
    "Capital Hobby Group Ltd develops specialist UK retail brands for trading-card collectors, players, modellers and hobby enthusiasts.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: corporateConfig.siteUrl,
    siteName: "Capital Hobby Group Ltd",
    title: "Capital Hobby Group Ltd | Specialist Hobby Retail Brands",
    description:
      "Specialist UK retail brands for trading-card collectors, players, modellers and hobby enthusiasts.",
    images: [{ url: "/brand/capital-hobby-group-horizontal.svg", alt: "Capital Hobby Group" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Capital Hobby Group Ltd | Specialist Hobby Retail Brands",
    description:
      "Specialist UK retail brands for trading-card collectors, players, modellers and hobby enthusiasts.",
    images: ["/brand/capital-hobby-group-horizontal.svg"],
  },
  icons: {
    icon: "/brand/capital-hobby-group-stacked.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090a0c",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
