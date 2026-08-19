-- Recurring weekly opening hours per property.
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  open_time time not null,
  close_time time not null,
  min_duration_minutes integer not null default 60 check (min_duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (open_time < close_time)
);

create index idx_availability_rules_property_id on public.availability_rules(property_id);

-- One-off blocks: maintenance, manual admin/owner block, or the cleaning buffer between
-- two shared-booking segments (§9 règle 6).
create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason public.availability_block_reason not null default 'manual',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index idx_availability_blocks_property_id on public.availability_blocks(property_id);
create index idx_availability_blocks_property_time
  on public.availability_blocks using gist (property_id, tstzrange(starts_at, ends_at));
