create sequence if not exists public.booking_code_seq;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  property_id uuid not null references public.properties(id),
  type public.booking_type not null default 'classic',
  status public.booking_status not null default 'draft',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_price numeric(12, 2) not null default 0 check (total_price >= 0),
  currency text not null default 'XOF',
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index idx_bookings_property_id on public.bookings(property_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_created_by on public.bookings(created_by);

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- Human-friendly reference, e.g. RES-2026-00125 (§11).
create or replace function public.generate_booking_code()
returns text
language plpgsql
as $$
declare
  v_seq bigint;
begin
  v_seq := nextval('public.booking_code_seq');
  return 'RES-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 5, '0');
end;
$$;
