-- Replaces the "arbitrary time window within availability_rules' open/close hours"
-- booking model with fixed slots anchored on the residence's check-in time (§ owner
-- feedback: clients found the free-drag time picker unhelpful; the real product is
-- day-use/half-day-use, not arbitrary hours). A cycle runs from check_in_time (default
-- 13:00) to check_in_time the next day, optionally split into two consecutive halves:
--   - "Journée complète"      : check_in_time        -> check_in_time (+1 day)
--   - "Demi-journée (jour)"   : check_in_time         -> check_in_time + 7h
--   - "Demi-journée (nuit)"   : check_in_time + 7h    -> check_in_time (+1 day)
-- Half-day slots are opt-in per residence (allows_half_day) — an owner who only wants
-- full-day stays can turn them off, which also disables the shared-booking flow, since a
-- shared booking is now exactly two clients each taking one half.
--
-- availability_rules is left untouched (still drives the calendar's day-of-week display
-- and the residence page's "Horaires d'ouverture" text) but no longer gates booking
-- creation — fits_checkin_slot replaces fits_availability_window for that purpose, and
-- unlike it, correctly allows the night half to cross midnight.

alter table public.properties add column allows_half_day boolean not null default true;

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
  v_full_end timestamptz;
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
  v_full_end := v_full_start + interval '1 day';

  if p_starts_at = v_full_start and p_ends_at = v_full_end then
    return true;
  end if;

  if v_allows_half_day then
    if p_starts_at = v_full_start and p_ends_at = v_half_boundary then
      return true;
    end if;
    if p_starts_at = v_half_boundary and p_ends_at = v_full_end then
      return true;
    end if;
  end if;

  return false;
end;
$$;

-- create_classic_booking: same body as 0027's version, minus the same-calendar-day
-- guard (fits_checkin_slot's exact-shape match makes it redundant and it would reject
-- the legitimate night-half slot) and with fits_checkin_slot replacing
-- fits_availability_window.
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

  v_booking_id := gen_random_uuid();
  v_booking_code := public.generate_booking_code();

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, v_booking_code, p_property_id, 'classic', 'awaiting_payment', p_starts_at, p_ends_at, v_property.base_price, v_property.currency, v_profile_id);

  insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
  values (v_booking_id, p_property_id, v_profile_id, 1, p_starts_at, p_ends_at, 'pending', v_property.base_price);

  insert into public.payments (booking_id, payer_profile_id, reference_code, amount, currency, status)
  values (v_booking_id, v_profile_id, v_booking_code || '-A', v_property.base_price, v_property.currency, 'pending');

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

-- create_shared_booking_request: same as 0023's version, same substitution.
create or replace function public.create_shared_booking_request(
  p_property_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_expiry_hours int default 24
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_property record;
  v_request_id uuid;
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

  insert into public.shared_booking_requests (property_id, initiator_profile_id, requested_start, requested_end, status, expires_at)
  values (p_property_id, v_profile_id, p_starts_at, p_ends_at, 'searching_partner', now() + make_interval(hours => p_expiry_hours))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.create_shared_booking_request(uuid, timestamptz, timestamptz, int) to authenticated;

-- join_shared_booking_request: same as 0027's version, same substitution. The combined
-- range of two consecutive half-day slots is always the full-day shape, so
-- fits_checkin_slot accepts it unconditionally (joining isn't gated by allows_half_day —
-- that only gates whether a half-day request could be *opened* in the first place).
create or replace function public.join_shared_booking_request(
  p_request_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_request record;
  v_property record;
  v_booking_id uuid;
  v_booking_code text;
  v_combined_start timestamptz;
  v_combined_end timestamptz;
  v_share numeric;
  v_first_participant uuid;
  v_second_participant uuid;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_request from public.shared_booking_requests where id = p_request_id for update;

  if not found then
    raise exception 'shared request not found';
  end if;
  if v_request.status <> 'searching_partner' then
    raise exception 'Cette demande de partage n''est plus disponible.';
  end if;
  if v_request.expires_at is not null and v_request.expires_at < now() then
    raise exception 'Cette demande de partage a expiré.';
  end if;
  if v_request.initiator_profile_id = v_profile_id then
    raise exception 'you cannot join your own request';
  end if;
  if p_starts_at >= p_ends_at then
    raise exception 'invalid time range';
  end if;

  if not (p_starts_at = v_request.requested_end or p_ends_at = v_request.requested_start) then
    raise exception 'Les créneaux doivent être consécutifs.';
  end if;

  select * into v_property from public.properties where id = v_request.property_id and status = 'approved';
  if not found then
    raise exception 'Cette résidence n''est pas disponible.';
  end if;

  v_combined_start := least(v_request.requested_start, p_starts_at);
  v_combined_end := greatest(v_request.requested_end, p_ends_at);

  if not public.fits_checkin_slot(v_request.property_id, v_combined_start, v_combined_end) then
    raise exception 'Le créneau combiné ne correspond pas à un créneau proposé par cette résidence.';
  end if;

  if exists (
    select 1 from public.availability_blocks
    where property_id = v_request.property_id
      and tstzrange(starts_at, ends_at) && tstzrange(v_combined_start, v_combined_end)
  ) then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
  end if;

  if public.has_overlapping_segment(v_request.property_id, v_combined_start, v_combined_end) then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
  end if;
  if public.has_overlapping_segment(v_request.property_id, v_combined_start, v_combined_end, v_property.cleaning_buffer_minutes) then
    raise exception 'Ce créneau ne respecte pas le délai de préparation/nettoyage nécessaire.';
  end if;

  v_booking_id := gen_random_uuid();
  v_booking_code := public.generate_booking_code();
  v_share := v_property.base_price / 2;

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, v_booking_code, v_request.property_id, 'shared', 'awaiting_payment', v_combined_start, v_combined_end, v_property.base_price, v_property.currency, v_request.initiator_profile_id);

  if v_request.requested_start < p_starts_at then
    v_first_participant := v_request.initiator_profile_id;
    v_second_participant := v_profile_id;
    insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
    values
      (v_booking_id, v_request.property_id, v_first_participant, 1, v_request.requested_start, v_request.requested_end, 'pending', v_share),
      (v_booking_id, v_request.property_id, v_second_participant, 2, p_starts_at, p_ends_at, 'pending', v_share);
  else
    v_first_participant := v_profile_id;
    v_second_participant := v_request.initiator_profile_id;
    insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
    values
      (v_booking_id, v_request.property_id, v_first_participant, 1, p_starts_at, p_ends_at, 'pending', v_share),
      (v_booking_id, v_request.property_id, v_second_participant, 2, v_request.requested_start, v_request.requested_end, 'pending', v_share);
  end if;

  insert into public.payments (booking_id, payer_profile_id, reference_code, amount, currency, status)
  values
    (v_booking_id, v_first_participant, v_booking_code || '-A', v_share, v_property.currency, 'pending'),
    (v_booking_id, v_second_participant, v_booking_code || '-B', v_share, v_property.currency, 'pending');

  update public.shared_booking_requests
    set status = 'converted', booking_id = v_booking_id, updated_at = now()
    where id = p_request_id;

  perform public.write_audit_log(v_profile_id, 'shared_booking_matched', 'booking', v_booking_id, null, jsonb_build_object('request_id', p_request_id));

  perform public.notify_property_owner(v_request.property_id, 'new_booking', 'Nouvelle réservation partagée : ' || v_booking_code, null, 'booking', v_booking_id);
  perform public.create_notification(v_request.initiator_profile_id, 'partner_found', 'Partenaire trouvé pour ' || v_booking_code, 'Un deuxième participant a rejoint votre demande de partage.', 'booking', v_booking_id);
  perform public.create_notification(v_first_participant, 'payment_requested', 'Paiement demandé pour ' || v_booking_code, null, 'booking', v_booking_id);
  perform public.create_notification(v_second_participant, 'payment_requested', 'Paiement demandé pour ' || v_booking_code, null, 'booking', v_booking_id);

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
end;
$$;

grant execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz) to authenticated;
