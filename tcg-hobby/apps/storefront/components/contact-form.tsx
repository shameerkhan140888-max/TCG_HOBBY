'use client';

import React, { useId, useState, type FormEvent, type InvalidEvent, type MouseEvent } from 'react';
import { Button, ErrorMessage, FormField, Input } from '@tcg-hobby/ui';
import { sendContactEnquiryAction } from '../lib/contact-actions';
import { CONTACT_FORM_ERROR, CONTACT_FORM_SUCCESS } from '../lib/contact-constants';

const requiredMessage = 'Please complete all required fields before sending your message.';
const requiredFields = ['name', 'email', 'subject', 'message'] as const;

export function ContactForm({ status }: { status?: string | undefined }) {
  const errorId = useId();
  const [clientError, setClientError] = useState<string | undefined>(undefined);
  const serverError =
    status === 'invalid'
      ? requiredMessage
      : status === 'limited'
        ? 'Please wait before sending another message.'
        : status === 'error'
          ? CONTACT_FORM_ERROR
          : undefined;
  const error = clientError ?? serverError;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const missingField = requiredFields.find((field) => !String(new FormData(form).get(field) ?? '').trim());

    if (missingField || !form.checkValidity()) {
      event.preventDefault();
      setClientError(requiredMessage);
      const invalidField =
        form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${missingField}"]`) ??
        form.querySelector<HTMLInputElement | HTMLTextAreaElement>(':invalid');
      invalidField?.focus();
    }
  }

  function handleInvalid(event: InvalidEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(requiredMessage);

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      event.target.focus();
    }
  }

  function handleSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const missingField = form
      ? requiredFields.find((field) => !String(new FormData(form).get(field) ?? '').trim())
      : undefined;

    if (form && (missingField || !form.checkValidity())) {
      event.preventDefault();
      setClientError(requiredMessage);
      const invalidField =
        form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${missingField}"]`) ??
        form.querySelector<HTMLInputElement | HTMLTextAreaElement>(':invalid');
      invalidField?.focus();
    }
  }

  return (
    <form id="contact-form" action={sendContactEnquiryAction} onInvalid={handleInvalid} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="returnTo" value="/contact" />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="contact-name">
          <Input id="contact-name" name="name" autoComplete="name" maxLength={100} required onChange={() => setClientError(undefined)} />
        </FormField>
        <FormField label="Email" htmlFor="contact-email">
          <Input id="contact-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required onChange={() => setClientError(undefined)} />
        </FormField>
      </div>

      <FormField label="Subject" htmlFor="contact-subject">
        <Input id="contact-subject" name="subject" maxLength={140} required onChange={() => setClientError(undefined)} />
      </FormField>

      <FormField label="Message" htmlFor="contact-message">
        <textarea
          id="contact-message"
          name="message"
          maxLength={2000}
          required
          rows={7}
          onChange={() => setClientError(undefined)}
          className="w-full rounded-md border border-surface-line bg-surface-ink px-3 py-3 text-sm text-neutral-50 outline-none transition-colors placeholder:text-neutral-500 focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </FormField>

      <ErrorMessage id={errorId} aria-live="polite">
        {error}
      </ErrorMessage>

      {status === 'sent' ? (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-medium text-emerald-200" aria-live="polite">
          {CONTACT_FORM_SUCCESS}
        </p>
      ) : null}

      <div className="space-y-3">
        <Button type="submit" className="w-full sm:w-auto" aria-describedby={error ? errorId : undefined} onClick={handleSubmitClick}>
          Send message
        </Button>
        <p className="text-xs leading-5 text-neutral-500">
          We&rsquo;ll use the information you provide only to respond to your enquiry. Please read our{' '}
          <a href="/privacy" className="text-neutral-300 underline decoration-accent/50 underline-offset-2 hover:text-accent-soft">
            Privacy Policy
          </a>{' '}
          for more information.
        </p>
      </div>
    </form>
  );
}
