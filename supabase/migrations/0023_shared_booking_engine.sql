-- Phase 8: the shared-booking RPCs from 0014 were written before Phase 6 (availability
-- rules) and Phase 7 (server-side pricing) existed, so they have the exact same gaps
-- create_classic_booking had before 0021/0022: opening hours were never checked, and
-- join_shared_booking_request took p_price_initiator/p_price_joiner straight from the
-- caller — any client could dictate both participants' prices. This migration extracts
-- the shared checks into two small helpers (also adopted by create_classic_booking, to
-- stop the same logic drifting across three copies) and rebuilds both shared-booking
-- functions on top of them, plus a cancel path for the pre-match phase (§35 "A annule
-- avant que B rejoigne").
--
-- Pricing model: each participant of a shared booking pays base_price / 2 — matches the
-- spec's own example (§12: two participants, same amount each) — regardless of how the
-- time is split between them. Not stated explicitly in the spec beyond that example; if
-- duration-proportional splitting is wanted instead, this is the one place to change.

create or replace function public.fits_availability_window(
  p_property_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
) returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.availability_rules r
    where r.property_id = p_property_id
      and r.is_active
      and r.day_of_week = extract(dow from p_starts_at)
      and p_starts_at::time >= r.open_time
      and p_ends_at::time <= r.close_time
      and (extract(epoch from (p_ends_at - p_starts_at)) / 60) >= r.min_duration_minutes
  );
$$;

create or replace function public.has_overlapping_segment(
  p_property_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_buffer_minutes integer default 0
) returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.booking_segments s
    where s.property_id = p_property_id
      and s.status <> 'cancelled'
      and tstzrange(
        s.starts_at - make_interval(mins => p_buffer_minutes),
        s.ends_at + make_interval(mins => p_buffer_minutes)
      ) && tstzrange(p_starts_at, p_ends_at)
  );
$$;

-- Re-expressed on top of the helpers above; behavior unchanged from 0022.
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

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, public.generate_booking_code(), p_property_id, 'classic', 'pending', p_starts_at, p_ends_at, v_property.base_price, v_property.currency, v_profile_id);

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

-- Réservation partagée, étape 1 (§10): publie "recherche d'un deuxième participant".
-- Same checks as a classic booking for the initiator's own slot, so a request can never
-- be opened for a slot that's already unavailable — join_shared_booking_request repeats
-- the checks for the *combined* window when someone actually joins.
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

  insert into public.shared_booking_requests (property_id, initiator_profile_id, requested_start, requested_end, status, expires_at)
  values (p_property_id, v_profile_id, p_starts_at, p_ends_at, 'searching_partner', now() + make_interval(hours => p_expiry_hours))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.create_shared_booking_request(uuid, timestamptz, timestamptz, int) to authenticated;

-- Réservation partagée, étape 2 (§9, §10, §11): B rejoint la demande de A.
-- Price is computed server-side (base_price / 2 each) — never trusted from the caller.
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
  v_combined_start timestamptz;
  v_combined_end timestamptz;
  v_share numeric;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;

  -- Lock the request row so two would-be joiners cannot both pass the status check
  -- before either commits.
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

  -- Règle 2 (§9): créneaux consécutifs — celui de B commence exactement quand celui de A
  -- finit, ou inversement. Règle 3 (absence de chevauchement) suit automatiquement d'une
  -- égalité stricte de bornes plutôt que d'un simple chevauchement partiel.
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

  -- Checked against *other* bookings only: the initiator's own segment doesn't exist yet
  -- at this point (inserted below, in the same transaction), and the joiner's segment is
  -- deliberately adjacent to it with zero gap by construction (Règle 2) — a cleaning
  -- buffer between the two shared participants is not part of this rule (§9 Règle 6: the
  -- first occupant prepares the residence within their own slot).
  if public.has_overlapping_segment(v_request.property_id, v_combined_start, v_combined_end) then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
  end if;
  if public.has_overlapping_segment(v_request.property_id, v_combined_start, v_combined_end, v_property.cleaning_buffer_minutes) then
    raise exception 'Ce créneau ne respecte pas le délai de préparation/nettoyage nécessaire.';
  end if;

  v_booking_id := gen_random_uuid();
  v_share := v_property.base_price / 2;

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, public.generate_booking_code(), v_request.property_id, 'shared', 'pending', v_combined_start, v_combined_end, v_property.base_price, v_property.currency, v_request.initiator_profile_id);

  -- Règle 1 (max 2 participants) is enforced by trg_check_max_segments. Règle 3 (no
  -- overlap) is guaranteed atomically by the EXCLUDE constraint on this insert.
  if v_request.requested_start < p_starts_at then
    insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
    values
      (v_booking_id, v_request.property_id, v_request.initiator_profile_id, 1, v_request.requested_start, v_request.requested_end, 'pending', v_share),
      (v_booking_id, v_request.property_id, v_profile_id, 2, p_starts_at, p_ends_at, 'pending', v_share);
  else
    insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
    values
      (v_booking_id, v_request.property_id, v_profile_id, 1, p_starts_at, p_ends_at, 'pending', v_share),
      (v_booking_id, v_request.property_id, v_request.initiator_profile_id, 2, v_request.requested_start, v_request.requested_end, 'pending', v_share);
  end if;

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

drop function if exists public.join_shared_booking_request(uuid, timestamptz, timestamptz, numeric, numeric);

-- §35 "A annule avant que B rejoigne": only the initiator (or admin) can withdraw a
-- still-open request. Once matched (status converted), cancellation goes through
-- cancel_booking (Phase 7) instead.
create or replace function public.cancel_shared_booking_request(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_request record;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_request from public.shared_booking_requests where id = p_request_id for update;
  if not found then
    raise exception 'shared request not found';
  end if;

  if v_request.initiator_profile_id <> v_profile_id and not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if v_request.status <> 'searching_partner' then
    raise exception 'Cette demande ne peut plus être annulée.';
  end if;

  update public.shared_booking_requests
    set status = 'cancelled', updated_at = now()
    where id = p_request_id;
end;
$$;

grant execute on function public.cancel_shared_booking_request(uuid) to authenticated;
