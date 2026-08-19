-- Postgres grants EXECUTE to PUBLIC by default on every new function, including
-- SECURITY DEFINER ones. write_audit_log() had no explicit grant and therefore was
-- callable directly by any authenticated (or even anon) client, with no checks inside it
-- — anyone could have forged arbitrary audit_logs rows (fake actor, fake action). It
-- must only ever run as an internal step of the other SECURITY DEFINER functions, which
-- keep working since a SECURITY DEFINER function's internal calls run as its owner, not
-- as the original caller.
revoke execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, jsonb) from public;

-- The client-callable RPCs already self-check auth.uid()/role internally, but they were
-- also left reachable by the "anon" role via the same default-PUBLIC grant. Tighten to
-- "authenticated" only, belt-and-suspenders (§24).
revoke execute on function public.create_classic_booking(uuid, timestamptz, timestamptz, numeric) from public;
revoke execute on function public.create_shared_booking_request(uuid, timestamptz, timestamptz, int) from public;
revoke execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz, numeric, numeric) from public;
revoke execute on function public.submit_payment(uuid) from public;
revoke execute on function public.confirm_payment(uuid) from public;

grant execute on function public.create_classic_booking(uuid, timestamptz, timestamptz, numeric) to authenticated;
grant execute on function public.create_shared_booking_request(uuid, timestamptz, timestamptz, int) to authenticated;
grant execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz, numeric, numeric) to authenticated;
grant execute on function public.submit_payment(uuid) to authenticated;
grant execute on function public.confirm_payment(uuid) to authenticated;
