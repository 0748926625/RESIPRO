-- Each participant pays their own share and gets a distinct reference (§7, §11):
-- RES-2026-00125-A / RES-2026-00125-B.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  segment_id uuid references public.booking_segments(id) on delete cascade,
  payer_profile_id uuid not null references public.profiles(id),
  reference_code text not null unique,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'XOF',
  status public.payment_status not null default 'pending',
  submitted_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_booking_id on public.payments(booking_id);
create index idx_payments_payer on public.payments(payer_profile_id);
create index idx_payments_status on public.payments(status);

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();
