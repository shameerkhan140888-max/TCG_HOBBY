import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AboutPage from './about/page';
import DeliveryReturnsPage from './delivery-returns/page';
import FaqPage from './faq/page';

vi.mock('../components/launch-header', () => ({
  LaunchHeader: () => <header>Launch header</header>,
}));

describe('customer information pages', () => {
  it('renders the production Delivery & Returns content', () => {
    const markup = renderToStaticMarkup(<DeliveryReturnsPage />);

    expect(markup).toContain('Delivery &amp; Returns');
    expect(markup).toContain('Free UK Mainland delivery on all orders over £50.');
    expect(markup).toContain('We also deliver to Northern Ireland.');
    expect(markup).toContain('Factory sealed trading card products may be returned if they remain unopened');
    expect(markup).toContain('BreadcrumbList');
  });

  it('renders the production FAQ questions', () => {
    const markup = renderToStaticMarkup(<FaqPage />);

    expect(markup).toContain('Frequently Asked Questions');
    expect(markup).toContain('Do I need an account?');
    expect(markup).toContain('Do you offer free delivery?');
    expect(markup).toContain('How do I unsubscribe from marketing emails?');
    expect(markup).toContain('FAQPage');
  });

  it('renders the production About page and company details', () => {
    const markup = renderToStaticMarkup(<AboutPage />);

    expect(markup).toContain('About TCG Hobby');
    expect(markup).toContain('Built by collectors. Trusted by collectors.');
    expect(markup).toContain('Genuine Products');
    expect(markup).toContain('Fair Purchase Limits');
    expect(markup).toContain('Capital Hobby Group Ltd');
    expect(markup).toContain('Company Number');
    expect(markup).toContain('17336948');
  });
});
