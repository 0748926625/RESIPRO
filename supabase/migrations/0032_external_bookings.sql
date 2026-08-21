-- Manual/offline bookings taken outside the platform. Attached to the owner calendar's
-- quick-mark tool: after marking a range of dates occupied, the owner can optionally
-- record who it's for and the negotiated rate, to generate a simple invoice (client name,
-- nights, nightly rate, total, advance paid, balance due).
--
-- Deliberately independent of availability_blocks: an invoice is a financial record that
-- should outlive the calendar block (once the stay is over, or the owner frees the dates
-- for another booking, the invoice must still exist), so there's no FK between them.
create table public.external_bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  client_name text not null,
  starts_at date not null,
  ends_at date not null,
  nightly_rate numeric(12, 2) not null check (nightly_rate >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  currency text not null default 'XOF',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint external_bookings_dates_check check (ends_at > starts_at)
);

create index idx_external_bookings_property_id on public.external_bookings(property_id, starts_at);

alter table public.external_bookings enable row level security;

create policy "external_bookings_owner_select" on public.external_bookings
  for select using (public.owns_property(property_id) or public.is_admin());

create policy "external_bookings_owner_insert" on public.external_bookings
  for insert with check (public.owns_property(property_id) or public.is_admin());

create policy "external_bookings_owner_update" on public.external_bookings
  for update using (public.owns_property(property_id) or public.is_admin());

create policy "external_bookings_owner_delete" on public.external_bookings
  for delete using (public.owns_property(property_id) or public.is_admin());
