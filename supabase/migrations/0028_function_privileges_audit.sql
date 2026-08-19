-- Phase 16 security audit: 0017 revoked PUBLIC execute from the 5 functions that existed
-- at the time, but every SECURITY DEFINER function created afterwards inherited the
-- default PUBLIC grant Postgres applies on CREATE — the pattern was never followed
-- consistently. Each of these already checks auth.uid()/role/ownership internally, so
-- this was not an active vulnerability (an anon caller still gets rejected), but it is a
-- real inconsistency with the documented "authenticated only" design that a future
-- migration author could reasonably assume already held. Closing it explicitly.
--
-- Note on join_shared_booking_request specifically: 0017 revoked PUBLIC from the
-- original 5-argument signature (with client-supplied prices); 0023 dropped that
-- overload and created a new 3-argument one, which — being a distinct function object —
-- was never itself revoked. Same root cause.
revoke execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.cancel_booking(uuid) from public;
revoke execute on function public.cancel_shared_booking_request(uuid) from public;
revoke execute on function public.reject_payment(uuid, text) from public;
revoke execute on function public.resubmit_payment(uuid) from public;
revoke execute on function public.admin_mark_booking_reserved_with_owner(uuid) from public;
revoke execute on function public.owner_confirm_booking(uuid) from public;
revoke execute on function public.set_property_status(uuid, public.property_status, public.property_status[]) from public;
revoke execute on function public.reverse_cash_transaction(uuid, text) from public;

grant execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.cancel_shared_booking_request(uuid) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.resubmit_payment(uuid) to authenticated;
grant execute on function public.admin_mark_booking_reserved_with_owner(uuid) to authenticated;
grant execute on function public.owner_confirm_booking(uuid) to authenticated;
grant execute on function public.set_property_status(uuid, public.property_status, public.property_status[]) to authenticated;
grant execute on function public.reverse_cash_transaction(uuid, text) to authenticated;

-- fits_availability_window / has_overlapping_segment (0023) are read-only helpers with no
-- side effects, but calling them directly would let anon enumerate whether a given
-- property/time-range is booked without going through the RLS-scoped booking_segments
-- SELECT policy. Internal-use only, same as write_audit_log/create_notification.
revoke execute on function public.fits_availability_window(uuid, timestamptz, timestamptz) from public;
revoke execute on function public.has_overlapping_segment(uuid, timestamptz, timestamptz, integer) from public;
