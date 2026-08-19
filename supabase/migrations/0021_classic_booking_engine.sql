-- Rebuilds create_classic_booking with the checks §7 actually requires and that the
-- 0014 version was missing:
--   - "tarif": price was a raw client-supplied parameter — a malicious client could pass
--     any amount. Now computed server-side from properties.base_price, never trusted
--     from the caller (§41).
--   - "horaires autorisés": the requested range must fit inside one of the property's
--     availability_rules windows for that weekday (Phase 6). Not checked at all before.
--   - "délai de préparation/nettoyage": the requested range must not fall within
--     cleaning_buffer_minutes of an existing segment. This is a pre-check (race-condition
--     safe checks remain the EXCLUDE constraint's job for literal overlap; a buffer
--     violation under extreme concurrency is a minor business-rule miss, not a double
--     booking, and is judged an acceptable trade-off for this MVP).
-- The model is same-day time-slot rental (matches every example in the spec: 13h→21h
-- etc.), so a request spanning midnight is rejected with a clear message rather than
-- silently mishandled.
drop function if exists public.create_classic_booking(uuid, timestamptz, timestamptz, numeric);

create or replace function public.create_classic_booking(
  p_property_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_property record;
  v_booking_id uuid;
  v_day_of_week int;
  v_fits_rule boolean;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_property from public.properties where id = p_property_id and status = 'approved';
  if not found then
    raise exception 'Cette résidence n''est pas disponible.';
  end if;

  if p_starts_at >= p_ends_at then
    raise exception 'invalid time range';
  end if;

  if p_starts_at::date <> (p_ends_at - interval '1 second')::date then
    raise exception 'Les réservations doivent commencer et se terminer le même jour.';
  end if;

  v_day_of_week := extract(dow from p_starts_at);

  select exists (
    select 1 from public.availability_rules r
    where r.property_id = p_property_id
      and r.is_active
      and r.day_of_week = v_day_of_week
      and p_starts_at::time >= r.open_time
      and p_ends_at::time <= r.close_time
      and (extract(epoch from (p_ends_at - p_starts_at)) / 60) >= r.min_duration_minutes
  ) into v_fits_rule;

  if not v_fits_rule then
    raise exception 'Le créneau sélectionné ne respecte pas les horaires autorisés de la résidence.';
  end if;

  if exists (
    select 1 from public.availability_blocks
    where property_id = p_property_id
      and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
  end if;

  if exists (
    select 1 from public.booking_segments s
    where s.property_id = p_property_id
      and s.status <> 'cancelled'
      and tstzrange(
        s.starts_at - make_interval(mins => v_property.cleaning_buffer_minutes),
        s.ends_at + make_interval(mins => v_property.cleaning_buffer_minutes)
      ) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception 'Ce créneau ne respecte pas le délai de préparation/nettoyage nécessaire après la réservation précédente.';
  end if;

  v_booking_id := gen_random_uuid();

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, public.generate_booking_code(), p_property_id, 'classic', 'pending', p_starts_at, p_ends_at, v_property.base_price, v_property.currency, v_profile_id);

  -- The EXCLUDE constraint on booking_segments is what actually prevents a double
  -- booking under concurrent requests; this INSERT is where a race condition would
  -- surface as an exclusion_violation, caught below.
  insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
  values (v_booking_id, p_property_id, v_profile_id, 1, p_starts_at, p_ends_at, 'pending', v_property.base_price);

  perform public.write_audit_log(v_profile_id, 'booking_created', 'booking', v_booking_id, null, jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at));

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
end;
$$;

grant execute on function public.create_classic_booking(uuid, timestamptz, timestamptz) to authenticated;

-- Lets a participant cancel their own not-yet-completed booking, or the admin cancel
-- any. Cancelling flips the segment to "cancelled" too, which is what actually frees the
-- slot again: the EXCLUDE constraint on booking_segments only excludes non-cancelled rows.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_booking record;
  v_is_participant boolean;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  select exists (
    select 1 from public.booking_segments s
    where s.booking_id = p_booking_id and s.participant_profile_id = v_profile_id
  ) into v_is_participant;

  if not v_is_participant and not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if v_booking.status in ('completed', 'cancelled', 'checked_in', 'checked_out') then
    raise exception 'Cette réservation ne peut plus être annulée.';
  end if;

  update public.bookings set status = 'cancelled', updated_at = now() where id = p_booking_id;
  update public.booking_segments set status = 'cancelled' where booking_id = p_booking_id;

  perform public.write_audit_log(v_profile_id, 'booking_cancelled', 'booking', p_booking_id, jsonb_build_object('status', v_booking.status), jsonb_build_object('status', 'cancelled'));
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
