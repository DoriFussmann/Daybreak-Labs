-- 003_client_type.sql
-- Client type for the General card (free text; presets in UI only).
alter table clients
  add column if not exists client_type text;
