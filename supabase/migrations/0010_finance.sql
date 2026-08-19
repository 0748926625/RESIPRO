create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category_id uuid references public.expense_categories(id),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'XOF',
  description text,
  expense_date date not null default current_date,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_expenses_property_id on public.expenses(property_id);
create index idx_expenses_date on public.expenses(expense_date);

create table public.recurring_charges (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  next_due_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_recurring_charges_property_id on public.recurring_charges(property_id);

create table public.income_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  booking_id uuid references public.bookings(id),
  source text not null default 'booking' check (source in ('booking', 'other')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'XOF',
  income_date date not null default current_date,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_income_property_id on public.income_transactions(property_id);
create index idx_income_date on public.income_transactions(income_date);

-- Never silently delete a cash movement (§19): corrections go through reversal_of,
-- pointing back at the transaction being cancelled/corrected.
create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  type public.cash_transaction_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null,
  performed_by uuid not null references public.profiles(id),
  related_income_id uuid references public.income_transactions(id),
  related_expense_id uuid references public.expenses(id),
  reversal_of uuid references public.cash_transactions(id),
  created_at timestamptz not null default now()
);

create index idx_cash_property_id on public.cash_transactions(property_id);
create index idx_cash_created_at on public.cash_transactions(created_at);
