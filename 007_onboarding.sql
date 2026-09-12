-- 007_onboarding.sql
-- InMarketLabs — onboarding module (intake -> client onboarding -> Day 0).
-- Adds onboarding fields to `clients`, a tokenized-access table, and RLS.
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent guards).

-- ---------- client onboarding fields ----------
alter table clients
  -- captured by Jay at intake
  add column if not exists program              text,
  add column if not exists level                text,   -- start | foundation_channels | scale
  add column if not exists second_contact       text,
  add column if not exists second_contact_email text,
  add column if not exists territory_note        text,   -- free text at intake; formalized into client_territories during build
  add column if not exists target_live_date     date,
  add column if not exists intake_notes         text,
  -- filled by the client on the onboarding page
  add column if not exists billing_address      text,
  add column if not exists billing_email        text,
  add column if not exists billing_contact      text,
  add column if not exists sending_address      text,
  add column if not exists sender_display_name  text,
  add column if not exists linkedin_url         text,
  add column if not exists booking_url          text,
  add column if not exists content_links        text,
  add column if not exists sales_when_responds  text,
  add column if not exists sales_follow_up      text,
  add column if not exists sales_first_contact  text,
  add column if not exists sales_notes          text,
  -- service order + signature
  add column if not exists terms_agreed_at      timestamptz,
  add column if not exists signature_name       text,
  add column if not exists signed_at            timestamptz,
  -- manual parts owned by admin
  add column if not exists invoice_url          text,
  add column if not exists sending_domains      text,
  add column if not exists paid_at              timestamptz,
  -- provenance + stage timestamps (stage is derived from these facts)
  add column if not exists field_source         jsonb not null default '{}'::jsonb,
  add column if not exists intake_submitted_at  timestamptz,
  add column if not exists ready_at             timestamptz,
  add column if not exists sent_at              timestamptz,
  add column if not exists onboarding_opened_at timestamptz,
  add column if not exists assets_submitted_at  timestamptz;

-- keep paid_at in sync when the admin flips `paid`
create or replace function public.sync_paid_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.paid and old.paid is distinct from new.paid then
    new.paid_at := now();
  elsif not new.paid then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_sync_paid_at on clients;
create trigger clients_sync_paid_at
  before update of paid on clients
  for each row execute procedure public.sync_paid_at();

-- ---------- tokenized access (no login) ----------
-- kind='intake'      -> link for Jay; client_id is null until he submits.
-- kind='onboarding'  -> link for the client; tied to a client, reusable until Day 0.
create table if not exists onboarding_tokens (
  token       text primary key,
  kind        text not null check (kind in ('intake','onboarding')),
  client_id   uuid references clients(id) on delete cascade,
  label       text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  used_at     timestamptz
);
create index if not exists onboarding_tokens_client_idx on onboarding_tokens (client_id);

alter table onboarding_tokens enable row level security;

-- Console (admin) can read tokens. Public token pages read/write via the
-- service-role key server-side, which bypasses RLS — so no anon policy exists,
-- and tokens are never listable by anyone but an operator.
drop policy if exists p_tokens_admin on onboarding_tokens;
create policy p_tokens_admin on onboarding_tokens for select
  using (public.is_admin());
