create extension if not exists pgcrypto;

create table if not exists iron_sprue_launch_subscribers (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  email_normalized text not null,
  status text not null default 'ACTIVE' check (status in ('PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'SUPPRESSED')),
  consent_given boolean not null default false,
  consent_wording text not null,
  consent_version text not null,
  consented_at timestamptz,
  source text not null default 'coming-soon-page',
  unsubscribe_token_hash text not null,
  email_status text not null default 'PENDING' check (email_status in ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED')),
  resend_message_id text,
  email_error text,
  confirmation_sent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint iron_sprue_launch_subscribers_store_check check (store_id = 'IRON_SPRUE'),
  constraint iron_sprue_launch_subscribers_email_check check (email_normalized = lower(trim(email_normalized)) and position('@' in email_normalized) > 1)
);

create unique index if not exists iron_sprue_launch_subscribers_store_email_unique
  on iron_sprue_launch_subscribers (store_id, email_normalized);

create unique index if not exists iron_sprue_launch_subscribers_unsubscribe_token_unique
  on iron_sprue_launch_subscribers (unsubscribe_token_hash);
