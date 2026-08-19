create table public.intermediation_requests (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid references public.profiles(id),
  full_name text not null,
  phone text not null,
  requested_city text,
  requested_neighborhood text,
  requested_date date,
  requested_start time,
  requested_end time,
  budget numeric(12, 2),
  party_size integer check (party_size is null or party_size > 0),
  preferences text,
  comments text,
  status public.intermediation_status not null default 'new',
  assigned_property_id uuid references public.properties(id),
  linked_booking_id uuid references public.bookings(id),
  handled_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_intermediation_status on public.intermediation_requests(status);
create index idx_intermediation_client on public.intermediation_requests(client_profile_id);

create trigger set_intermediation_updated_at
  before update on public.intermediation_requests
  for each row execute function public.set_updated_at();
