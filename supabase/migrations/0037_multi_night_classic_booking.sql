-- 0036 anchored every booking to exactly one check_in_time cycle (24h, or one of its two
-- halves), which made a client-facing bug obvious: this is a furnished-residence rental
-- app, and clients could not book more than a single night through the calendar. Half-day
-- slots stay single-cycle (splitting a day in half only makes sense for one day), but the
-- full-day shape now accepts any whole number of consecutive 24h cycles from check_in_time,
-- so a client can drag across several days for a multi-night stay.

create or replace function public.fits_checkin_slot(
  p_property_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_check_in time;
  v_allows_half_day boolean;
  v_full_start timestamptz;
  v_half_boundary timestamptz;
  v_days numeric;
begin
  select coalesce(check_in_time, time '13:00'), allows_half_day
    into v_check_in, v_allows_half_day
    from public.properties
    where id = p_property_id;

  if not found then
    return false;
  end if;

  v_full_start := date_trunc('day', p_starts_at) + v_check_in;
  if p_starts_at < v_full_start then
    v_full_start := v_full_start - interval '1 day';
  end if;
  v_half_boundary := v_full_start + interval '7 hours';

  if p_starts_at = v_full_start then
    v_days := extract(epoch from (p_ends_at - v_full_start)) / 86400;
    if v_days >= 1 and v_days = floor(v_days) then
      return true;
    end if;
  end if;

  if v_allows_half_day then
    if p_starts_at = v_full_start and p_ends_at = v_half_boundary then
      return true;
    end if;
    if p_starts_at = v_half_boundary and p_ends_at = v_full_start + interval '1 day' then
      return true;
    end if;
  end if;

  return false;
end;
$$;

-- create_classic_booking: same body as 0036's version, except total_price now scales with
-- the number of full-day cycles booked (base_price per night) instead of always charging a
-- single base_price — the half-day shapes (7h/17h span) are unaffected and stay flat-rate.
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
  v_booking_code text;
  v_nights numeric;
  v_total_price numeric;
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

  if not public.fits_checkin_slot(p_property_id, p_starts_at, p_ends_at) then
    raise exception 'Le créneau sélectionné ne correspond pas à un créneau proposé par cette résidence.';
  end if;

  if exists (
    select 1 from public.availability_blocks
    where property_id = p_property_id
      and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
  end if;

  if public.has_overlapping_segment(p_property_id, p_starts_at, p_ends_at) then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
  end if;

  if public.has_overlapping_segment(p_property_id, p_starts_at, p_ends_at, v_property.cleaning_buffer_minutes) then
    raise exception 'Ce créneau ne respecte pas le délai de préparation/nettoyage nécessaire après la réservation précédente.';
  end if;

  v_nights := extract(epoch from (p_ends_at - p_starts_at)) / 86400;
  if v_nights >= 1 and v_nights = floor(v_nights) then
    v_total_price := v_property.base_price * v_nights;
  else
    v_total_price := v_property.base_price;
  end if;

  v_booking_id := gen_random_uuid();
  v_booking_code := public.generate_booking_code();

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, v_booking_code, p_property_id, 'classic', 'awaiting_payment', p_starts_at, p_ends_at, v_total_price, v_property.currency, v_profile_id);

  insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
  values (v_booking_id, p_property_id, v_profile_id, 1, p_starts_at, p_ends_at, 'pending', v_total_price);

  insert into public.payments (booking_id, payer_profile_id, reference_code, amount, currency, status)
  values (v_booking_id, v_profile_id, v_booking_code || '-A', v_total_price, v_property.currency, 'pending');

  perform public.write_audit_log(v_profile_id, 'booking_created', 'booking', v_booking_id, null, jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at));

  perform public.notify_property_owner(p_property_id, 'new_booking', 'Nouvelle réservation : ' || v_booking_code, null, 'booking', v_booking_id);
  perform public.create_notification(v_profile_id, 'payment_requested', 'Paiement demandé pour ' || v_booking_code, 'Référence ' || v_booking_code || '-A', 'booking', v_booking_id);

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
end;
$$;

grant execute on function public.create_classic_booking(uuid, timestamptz, timestamptz) to authenticated;
