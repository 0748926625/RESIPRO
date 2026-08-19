-- Each segment is one participant's slice of a booking (§23). Merges what the spec
-- lists separately as booking_segments/booking_participants: a segment already carries
-- its participant, a separate join table would be redundant.
create table public.booking_segments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id),
  participant_profile_id uuid not null references public.profiles(id),
  segment_order smallint not null check (segment_order in (1, 2)),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.segment_status not null default 'pending',
  price_share numeric(12, 2) not null default 0 check (price_share >= 0),
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  unique (booking_id, segment_order),
  -- Race-condition guard (§9 règle 5, §33): Postgres rejects, atomically at commit time,
  -- any segment whose time range overlaps another active segment on the same property.
  -- This is enforced by the database itself, never by frontend checks alone.
  exclude using gist (
    property_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);

create index idx_booking_segments_booking_id on public.booking_segments(booking_id);
create index idx_booking_segments_participant on public.booking_segments(participant_profile_id);

-- Belt-and-suspenders cap on participants (§9 règle 1), on top of the application-level
-- checks in the RPC functions that create segments.
create or replace function public.check_max_segments()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.booking_segments where booking_id = new.booking_id) >= 2 then
    raise exception 'A booking cannot have more than 2 segments/participants';
  end if;
  return new;
end;
$$;

create trigger trg_check_max_segments
  before insert on public.booking_segments
  for each row execute function public.check_max_segments();

-- The pre-match phase: "recherche d'un deuxième participant" (§10).
create table public.shared_booking_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  initiator_profile_id uuid not null references public.profiles(id),
  requested_start timestamptz not null,
  requested_end timestamptz not null,
  status public.shared_request_status not null default 'searching_partner',
  booking_id uuid references public.bookings(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requested_start < requested_end)
);

create index idx_shared_requests_property_id on public.shared_booking_requests(property_id);
create index idx_shared_requests_status on public.shared_booking_requests(status);

create trigger set_shared_requests_updated_at
  before update on public.shared_booking_requests
  for each row execute function public.set_updated_at();
