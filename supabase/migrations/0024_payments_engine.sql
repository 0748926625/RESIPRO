-- Phase 9: no payment row was ever created anywhere — the `payments` table (0009) and
-- submit_payment/confirm_payment (0014/0017) existed but had nothing to operate on. This
-- migration:
--   1. Makes create_classic_booking / join_shared_booking_request insert one payment row
--      per segment (§11: each participant gets a distinct reference — booking_code + "A"
--      or "B" from segment_order — and pays their own price_share), and moves the
--      booking straight to awaiting_payment since payment is always the next step.
--   2. Adds reject_payment, for when the admin finds the declared payment doesn't match
--      what actually arrived (§35 "Le Super Admin doit pouvoir intervenir manuellement").
--   3. Closes the loop described in §51/§13: payment_received is NOT "réservation
--      confirmée" — the admin still has to reserve with the owner off-platform, then the
--      owner confirms. Two small admin/owner-scoped transitions model that manual step
--      without simulating any integration that doesn't exist (§36).

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

  if p_starts_at::date <> (p_ends_at - interval '1 second')::date then
    raise exception 'Les réservations doivent commencer et se terminer le même jour.';
  end if;

  if not public.fits_availability_window(p_property_id, p_starts_at, p_ends_at) then
    raise exception 'Le créneau sélectionné ne respecte pas les horaires autorisés de la résidence.';
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

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
end;
$$;

grant execute on function public.create_classic_booking(uuid, timestamptz, timestamptz) to authenticated;

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

  if v_combined_start::date <> (v_combined_end - interval '1 second')::date then
    raise exception 'Les réservations doivent commencer et se terminer le même jour.';
  end if;

  if not public.fits_availability_window(v_request.property_id, v_combined_start, v_combined_end) then
    raise exception 'Le créneau combiné ne respecte pas les horaires autorisés de la résidence.';
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

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
end;
$$;

grant execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz) to authenticated;

-- Admin finds the declared payment doesn't match what actually arrived on the Mobile
-- Money account (§35). Rejecting does not touch the booking status — the client (or the
-- admin, off-platform) sorts out the mismatch and the client can submit_payment() again.
create or replace function public.reject_payment(p_payment_id uuid, p_note text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_payment record;
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment not found';
  end if;
  if v_payment.status = 'payment_confirmed' then
    raise exception 'payment already confirmed';
  end if;

  update public.payments
    set status = 'payment_rejected', notes = coalesce(p_note, notes), updated_at = now()
    where id = p_payment_id;

  perform public.write_audit_log(v_admin_id, 'payment_rejected', 'payment', p_payment_id, null, jsonb_build_object('note', p_note));
end;
$$;

grant execute on function public.reject_payment(uuid, text) to authenticated;

-- Lets a rejected/pending payment be re-submitted after the client sorts out the mismatch.
create or replace function public.resubmit_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_payment record;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'payment not found';
  end if;
  if v_payment.payer_profile_id <> v_profile_id then
    raise exception 'not authorized';
  end if;
  if v_payment.status <> 'payment_rejected' then
    raise exception 'only a rejected payment can be resubmitted';
  end if;

  update public.payments
    set status = 'payment_submitted', submitted_at = now(), updated_at = now()
    where id = p_payment_id;

  perform public.write_audit_log(v_profile_id, 'payment_submitted', 'payment', p_payment_id, null, null);
end;
$$;

grant execute on function public.resubmit_payment(uuid) to authenticated;

-- §51/§13: "paiement reçu" ≠ "résidence réservée". Once every payment for a booking is
-- confirmed (confirm_payment already advances the booking to payment_received), the
-- admin still has to contact/reserve with the owner off-platform before the owner
-- confirms. These two transitions record that manual real-world step — neither
-- simulates an integration that doesn't exist (§36).
create or replace function public.admin_mark_booking_reserved_with_owner(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_booking record;
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;
  if v_booking.status <> 'payment_received' then
    raise exception 'Cette réservation n''a pas encore tous ses paiements confirmés.';
  end if;

  update public.bookings set status = 'awaiting_owner_confirmation', updated_at = now() where id = p_booking_id;

  perform public.write_audit_log(v_admin_id, 'booking_reserved_with_owner', 'booking', p_booking_id, jsonb_build_object('status', 'payment_received'), jsonb_build_object('status', 'awaiting_owner_confirmation'));
end;
$$;

grant execute on function public.admin_mark_booking_reserved_with_owner(uuid) to authenticated;

create or replace function public.owner_confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_booking record;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;

  if not public.owns_property(v_booking.property_id) and not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if v_booking.status <> 'awaiting_owner_confirmation' then
    raise exception 'Cette réservation n''est pas en attente de votre confirmation.';
  end if;

  update public.bookings set status = 'confirmed', updated_at = now() where id = p_booking_id;

  perform public.write_audit_log(v_profile_id, 'booking_confirmed_by_owner', 'booking', p_booking_id, jsonb_build_object('status', 'awaiting_owner_confirmation'), jsonb_build_object('status', 'confirmed'));
end;
$$;

grant execute on function public.owner_confirm_booking(uuid) to authenticated;
