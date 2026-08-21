-- Default check-in/check-out to 13:00–13:00 (owner-requested standard for this
-- marketplace), matching the default now pre-filled in PropertyForm on creation. A
-- column default keeps this true for any row created outside that form too.
alter table public.properties alter column check_in_time set default '13:00';
alter table public.properties alter column check_out_time set default '13:00';
