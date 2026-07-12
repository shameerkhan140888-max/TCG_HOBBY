'use server';

import { Resend } from 'resend';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateSubscriberEmail } from '@tcg-hobby/database';
import { isSignupRateLimited } from './signup-rate-limit';

type ContactField = 'name' | 'email' | 'subject' | 'message';

const MAX_LENGTHS: Record<ContactField, number> = {
  name: 100,
  email: 254,
  subject: 140,
  message: 2000,
};

function getReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/contact')) {
    return '/contact';
  }

  return value;
}

function withContactStatus(returnTo: string, value: 'sent' | 'invalid' | 'limited' | 'error') {
  const base = returnTo.split('#')[0] ?? '/contact';
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}contactStatus=${value}#contact-form`;
}

function normalizeField(formData: FormData, field: ContactField) {
  return String(formData.get(field) ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTHS[field]);
}

function normalizeMessage(formData: FormData) {
  return String(formData.get('message') ?? '').trim().slice(0, MAX_LENGTHS.message);
}

async function getRequestIp() {
  const headerList = await headers();
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headerList.get('x-real-ip') ?? 'unknown';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendContactEnquiryAction(formData: FormData) {
  const returnTo = getReturnTo(formData.get('returnTo'));
  const honeypot = String(formData.get('company') ?? '').trim();

  if (honeypot) {
    redirect(withContactStatus(returnTo, 'invalid'));
  }

  const name = normalizeField(formData, 'name');
  const email = normalizeField(formData, 'email');
  const subject = normalizeField(formData, 'subject');
  const message = normalizeMessage(formData);
  const emailValidation = validateSubscriberEmail(email);

  if (!name || !emailValidation.ok || !subject || !message) {
    redirect(withContactStatus(returnTo, 'invalid'));
  }

  const ip = await getRequestIp();
  if (isSignupRateLimited(`contact:${emailValidation.email}:${ip}`)) {
    redirect(withContactStatus(returnTo, 'limited'));
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      redirect(withContactStatus(returnTo, 'error'));
    }

    redirect(withContactStatus(returnTo, 'sent'));
  }

  try {
    const resend = new Resend(apiKey);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(emailValidation.email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

    await resend.emails.send({
      from: 'TCG Hobby Website <no-reply@tcg-hobby.co.uk>',
      to: 'info@tcg-hobby.co.uk',
      replyTo: emailValidation.email,
      subject: `TCG Hobby contact: ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#171717;line-height:1.5">
          <h1 style="font-size:20px">New TCG Hobby website enquiry</h1>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <p>${safeMessage}</p>
        </div>
      `,
      text: [
        'New TCG Hobby website enquiry',
        '',
        `Name: ${name}`,
        `Email: ${emailValidation.email}`,
        `Subject: ${subject}`,
        '',
        message,
      ].join('\n'),
    });
  } catch {
    redirect(withContactStatus(returnTo, 'error'));
  }

  redirect(withContactStatus(returnTo, 'sent'));
}
