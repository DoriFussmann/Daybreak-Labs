-- Client profile fields for the General card.
alter table clients
  add column if not exists company_name text,
  add column if not exists key_contact text,
  add column if not exists key_contact_email text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists site_pixel text;
