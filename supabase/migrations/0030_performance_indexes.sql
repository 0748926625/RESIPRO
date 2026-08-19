-- Phase 16 performance pass. bookings.starts_at had no index at all despite being
-- filtered/ordered on directly in the admin dashboard (today's bookings, upcoming
-- bookings) across every property on the platform, not scoped to a single owner.
create index if not exists idx_bookings_starts_at on public.bookings(starts_at);

-- The finance/dashboard pages (Phase 11/13) always filter income/expenses by
-- (property_id, date range) together — composite indexes serve that access pattern
-- directly instead of relying on the planner to bitmap-AND two separate single-column
-- indexes.
create index if not exists idx_income_property_date on public.income_transactions(property_id, income_date);
create index if not exists idx_expenses_property_date on public.expenses(property_id, expense_date);
create index if not exists idx_cash_property_created on public.cash_transactions(property_id, created_at);
