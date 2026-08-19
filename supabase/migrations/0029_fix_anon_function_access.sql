-- CRITICAL FIX: every "REVOKE EXECUTE ... FROM PUBLIC" done since 0017 was ineffective.
-- Supabase's standard project setup runs `ALTER DEFAULT PRIVILEGES IN SCHEMA public
-- GRANT EXECUTE ON FUNCTIONS TO anon, authenticated`, which grants EXECUTE directly to
-- those two roles at function-creation time — entirely independent of the PUBLIC
-- pseudo-role. Revoking from PUBLIC alone left the anon role's direct grant untouched.
--
-- Confirmed empirically against the live database: an anon (unauthenticated) client could
-- still successfully invoke write_audit_log() — supposedly locked down since Phase 5 — and
-- the call executed (it only failed on an unrelated foreign-key violation from a bogus
-- test UUID, proving the function body ran). Every "internal-only" and "authenticated-only"
-- function created since has the same exposure, including anyone being able to attempt
-- cancel_booking, reverse_cash_transaction, set_property_status, etc. as anon (each still
-- rejects on its own internal auth.uid()/role check, so this was not a full bypass of
-- business rules — but it is real, unintended exposure that must be closed properly).
--
-- The fix is the same REVOKE, naming "anon" explicitly rather than relying on PUBLIC.
-- is_admin() and owns_property() are deliberately NOT touched here: RLS policies across
-- every table call them as the querying role (anon for public browsing, authenticated
-- otherwise), so revoking those would break RLS evaluation itself, not just harden it.

-- Fully internal: never callable by any client role, only from inside other
-- SECURITY DEFINER functions.
revoke execute on function public.write_audit_log(uuid, text, text, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.create_notification(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.notify_property_owner(uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.fits_availability_window(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.has_overlapping_segment(uuid, timestamptz, timestamptz, integer) from public, anon, authenticated;

-- Authenticated-only: revoke from anon specifically (PUBLIC revoke alone does nothing),
-- keep the existing "to authenticated" grants intact.
revoke execute on function public.create_classic_booking(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.create_shared_booking_request(uuid, timestamptz, timestamptz, int) from public, anon;
revoke execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.submit_payment(uuid) from public, anon;
revoke execute on function public.confirm_payment(uuid) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.cancel_shared_booking_request(uuid) from public, anon;
revoke execute on function public.reject_payment(uuid, text) from public, anon;
revoke execute on function public.resubmit_payment(uuid) from public, anon;
revoke execute on function public.admin_mark_booking_reserved_with_owner(uuid) from public, anon;
revoke execute on function public.owner_confirm_booking(uuid) from public, anon;
revoke execute on function public.set_property_status(uuid, public.property_status, public.property_status[]) from public, anon;
revoke execute on function public.reverse_cash_transaction(uuid, text) from public, anon;
