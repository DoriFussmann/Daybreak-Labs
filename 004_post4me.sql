-- 004_post4me.sql
-- Post4Me: topic bank, weekly generation cycles, and the 4 -> 2 candidate flow.
-- Follows v1 conventions: service_role does all writes; the portal reads via RLS.
-- Run after 001..003 in the Supabase SQL editor.

-- ---------- status of a client's weekly cycle ----------
create type post_cycle_status as enum (
  'generated',   -- 4 candidates written, waiting on the client
  'selected',    -- client picked 2
  'approved',    -- admin signed off (human in the loop)
  'scheduled',   -- handed to the posting pipeline (out of scope for now)
  'skipped',     -- no selection by the deadline, or client opted out this week
  'failed'
);

-- ---------- topic bank (admin-managed, internal to the console) ----------
create table post_topics (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,        -- the topic the generator writes from
  guidance     text,                 -- optional angle / do's and don'ts for this topic
  client_type  text,                 -- matches clients.client_type; null = applies to all types
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index post_topics_active_type_idx on post_topics (is_active, client_type);

-- ---------- per-client flavor the CLIENT can edit ----------
-- clients.post4me_prompt already exists (admin-set direction / voice).
-- This is the client's own note ("ex-military"; "sold 5 franchises, no MBA").
alter table clients add column if not exists post4me_flavor text;

-- ---------- one generation run per client per week ----------
create table post_cycles (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references clients(id) on delete cascade,
  cycle_date         date not null,           -- the Monday the batch was generated
  status             post_cycle_status not null default 'generated',
  selection_deadline timestamptz,             -- Tuesday 23:59 America/New_York
  posting_mode       posting_mode not null,   -- snapshot of the client's mode at generation
  created_at         timestamptz not null default now(),
  selected_at        timestamptz,
  approved_at        timestamptz,
  unique (client_id, cycle_date)              -- idempotency guard, like pipeline_runs.run_date
);
create index post_cycles_client_idx on post_cycles (client_id, cycle_date desc);

-- ---------- the 4 suggestions; the client marks 2 chosen ----------
create table post_candidates (
  id           uuid primary key default gen_random_uuid(),
  cycle_id     uuid not null references post_cycles(id) on delete cascade,
  topic_id     uuid references post_topics(id) on delete set null,
  variant      smallint not null,    -- 1..4
  body         text not null,        -- the LinkedIn post text
  chosen       boolean not null default false,
  slot         text,                 -- 'wed' | 'fri' once selected; null otherwise
  created_at   timestamptz not null default now(),
  unique (cycle_id, variant)
);
create index post_candidates_cycle_idx on post_candidates (cycle_id);

-- =====================================================================
-- Row-Level Security  (read-only for the portal; writes are service_role)
-- =====================================================================
alter table post_topics     enable row level security;
alter table post_cycles     enable row level security;
alter table post_candidates enable row level security;

-- topics are internal: admin reads; clients never see the raw bank.
create policy p_topics_admin on post_topics for select using (public.is_admin());

-- cycles: a client sees its own; admin sees all.
create policy p_cycles_read on post_cycles for select
  using (public.is_admin() or client_id in (select public.current_client_ids()));

-- candidates: visible if the parent cycle is visible.
create policy p_candidates_read on post_candidates for select
  using (
    public.is_admin()
    or exists (
      select 1 from post_cycles c
      where c.id = post_candidates.cycle_id
        and c.client_id in (select public.current_client_ids())
    )
  );

-- No INSERT/UPDATE/DELETE policies, by design. Selection and approval run through
-- server actions using the service_role key after canAccessClient() verifies the user.
