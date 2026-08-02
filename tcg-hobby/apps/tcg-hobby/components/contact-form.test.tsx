import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContactForm } from './contact-form';

vi.mock('../lib/contact-actions', () => ({
  sendContactEnquiryAction: vi.fn(),
}));

describe('ContactForm', () => {
  it('renders accessible required fields and privacy copy', () => {
    const markup = renderToStaticMarkup(<ContactForm />);

    expect(markup).toContain('name="name"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="subject"');
    expect(markup).toContain('name="message"');
    expect(markup).toContain('required=""');
    expect(markup).toContain('name="company"');
    expect(markup).toContain('href="/privacy"');
  });

  it('renders success and validation states', () => {
    expect(renderToStaticMarkup(<ContactForm status="sent" />)).toContain('Thanks. Your message has been sent');
    expect(renderToStaticMarkup(<ContactForm status="invalid" />)).toContain('Please complete all required fields');
  });
});
