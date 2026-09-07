-- 006_post4me_notes.sql
-- Direction lines (admin), client notes (max 5 in the app), and sent_at on cycles.
-- Safe to re-run. Skip if these objects already exist with a different shape.

alter table post_cycles add column if not exists sent_at timestamptz;

create table if not exists client_post_directions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists client_post_directions_client_idx
  on client_post_directions (client_id);

create table if not exists client_post_notes (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists client_post_notes_client_idx
  on client_post_notes (client_id);

alter table client_post_directions enable row level security;
alter table client_post_notes enable row level security;

drop policy if exists p_directions_admin on client_post_directions;
create policy p_directions_admin on client_post_directions for select
  using (public.is_admin());

drop policy if exists p_notes_read on client_post_notes;
create policy p_notes_read on client_post_notes for select
  using (public.is_admin() or client_id in (select public.current_client_ids()));
