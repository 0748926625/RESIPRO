-- Extensible amenity catalog (§5: "Les filtres doivent être facilement extensibles").
create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  icon text,
  category text
);

create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

create index idx_property_amenities_amenity_id on public.property_amenities(amenity_id);
