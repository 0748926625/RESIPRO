-- Lets the owner calendar color-code consecutive occupied dates by client: today a
-- quick-marked block (setQuickBlocks, availability/actions.ts) carries no client identity
-- at all — the only place a client name exists is the separate, optional invoice
-- (external_bookings), which has no FK back to the blocks it covers. A plain nullable
-- column here is enough; blocks stay independent of external_bookings on purpose (see
-- 0032 — an invoice must outlive the calendar block).
alter table public.availability_blocks add column client_name text;
