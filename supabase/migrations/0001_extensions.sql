-- Extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- required for EXCLUDE constraints mixing equality (uuid) and range overlap

-- Generic "updated_at" maintenance, reused by every table with an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
