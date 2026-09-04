-- User roles for people added in the Supabase dashboard.
-- Run in the SQL editor after 001_schema.sql / 002_client_details.sql.
--
-- How to add a user:
--   1. Authentication → Users → Add user (email + password).
--   2. Table Editor → profiles → set `role` to superadmin, admin, or client.
--      A profile row is created automatically; default is client.
--   3. If role is client, either set that email as the client's key contact
--      or insert a row in client_members (user_id, client_id).
--
-- Optional: when adding the Auth user, set User Metadata to
--   { "role": "admin" }
-- and the profile will pick that up instead of defaulting to client.
--
-- superadmin and admin both get the operator console. client is portal-only.

do $$ begin
  create type user_role as enum ('superadmin', 'admin', 'client');
exception
  when duplicate_object then null;
end $$;

alter table profiles add column if not exists role user_role;

update profiles
  set role = case when is_admin then 'admin'::user_role else 'client'::user_role end
  where role is null;

alter table profiles alter column role set default 'client';
alter table profiles alter column role set not null;

create or replace function public.sync_profile_role()
returns trigger language plpgsql set search_path = public as $$
begin
  new.is_admin := new.role in ('admin', 'superadmin');
  return new;
end;
$$;

drop trigger if exists profiles_sync_role on profiles;
create trigger profiles_sync_role
  before insert or update of role on profiles
  for each row execute procedure public.sync_profile_role();

update profiles set is_admin = (role in ('admin', 'superadmin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := lower(coalesce(new.raw_user_meta_data->>'role', ''));
  r public.user_role;
begin
  r := case requested
    when 'superadmin' then 'superadmin'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'client'::public.user_role
  end;
  insert into public.profiles (id, role) values (new.id, r)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, role)
select id, 'client'::user_role from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.role in ('admin', 'superadmin') from profiles p where p.id = auth.uid()),
    false
  )
$$;
