create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete cascade,
  slug text not null unique,
  name text not null,
  description text,
  property_type text not null default 'apartment',
  city text not null,
  neighborhood text,
  address text,
  latitude double precision,
  longitude double precision,
  capacity integer not null default 1 check (capacity > 0),
  bedrooms integer not null default 1 check (bedrooms >= 0),
  base_price numeric(12, 2) not null default 0 check (base_price >= 0),
  currency text not null default 'XOF',
  check_in_time time,
  check_out_time time,
  cleaning_buffer_minutes integer not null default 0 check (cleaning_buffer_minutes >= 0),
  house_rules text,
  -- Le numéro personnel du gérant n'est jamais exposé par défaut (cahier des charges §6).
  manager_phone_visibility public.manager_phone_visibility not null default 'admin_only',
  status public.property_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_owner_id on public.properties(owner_id);
create index idx_properties_status on public.properties(status);
create index idx_properties_city on public.properties(city);

create trigger set_properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_property_images_property_id on public.property_images(property_id);
