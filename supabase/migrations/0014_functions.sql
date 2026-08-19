-- Critical business-rule functions. All SECURITY DEFINER so they can enforce invariants
-- (max 2 participants, consecutive/non-overlapping segments, payment-before-owner-booking)
-- centrally, instead of trusting client-side checks (§24, §41, §53). Each function still
-- performs its own authorization check since SECURITY DEFINER bypasses RLS.

create or replace function public.write_audit_log(
  p_actor uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old jsonb default null,
  p_new jsonb default null
) returns void
language sql
security definer set search_path = public
as $$
  insert into public.audit_logs (actor_profile_id, action, entity_type, entity_id, old_value, new_value)
  values (p_actor, p_action, p_entity_type, p_entity_id, p_old, p_new);
$$;

-- Réservation classique (§7): un seul participant.
create or replace function public.create_classic_booking(
  p_property_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_price numeric
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

  if exists (
    select 1 from public.availability_blocks
    where property_id = p_property_id
      and tstzrange(starts_at, ends_at) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
  end if;

  v_booking_id := gen_random_uuid();

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (v_booking_id, public.generate_booking_code(), p_property_id, 'classic', 'pending', p_starts_at, p_ends_at, p_price, v_property.currency, v_profile_id);

  -- The EXCLUDE constraint on booking_segments is what actually prevents a double
  -- booking under concurrent requests; this INSERT is where a race condition would
  -- surface as an exclusion_violation, caught below.
  insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
  values (v_booking_id, p_property_id, v_profile_id, 1, p_starts_at, p_ends_at, 'pending', p_price);

  perform public.write_audit_log(v_profile_id, 'booking_created', 'booking', v_booking_id, null, jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at));

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
end;
$$;

grant execute on function public.create_classic_booking(uuid, timestamptz, timestamptz, numeric) to authenticated;

-- Réservation partagée, étape 1 (§10): A publie sa demande, "recherche d'un deuxième participant".
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
  v_request_id uuid;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;
  if p_starts_at >= p_ends_at then
    raise exception 'invalid time range';
  end if;
  if not exists (select 1 from public.properties where id = p_property_id and status = 'approved') then
    raise exception 'Cette résidence n''est pas disponible.';
  end if;

  insert into public.shared_booking_requests (property_id, initiator_profile_id, requested_start, requested_end, status, expires_at)
  values (p_property_id, v_profile_id, p_starts_at, p_ends_at, 'searching_partner', now() + make_interval(hours => p_expiry_hours))
  returning id into v_request_id;

  return v_request_id;
end;
$$;

grant execute on function public.create_shared_booking_request(uuid, timestamptz, timestamptz, int) to authenticated;

-- Réservation partagée, étape 2 (§10, §9): B rejoint la demande de A.
-- Valide : même résidence/date (portée par la demande elle-même), créneaux consécutifs,
-- absence de chevauchement (garantie par la contrainte EXCLUDE), maximum deux participants
-- (garanti par trg_check_max_segments).
create or replace function public.join_shared_booking_request(
  p_request_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_price_initiator numeric,
  p_price_joiner numeric
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_request record;
  v_property record;
  v_booking_id uuid;
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
    raise exception 'Cette réservation nécessite encore un deuxième participant, mais cette demande n''est plus disponible.';
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

  -- Règle 2: créneaux consécutifs (le créneau de B commence quand celui de A finit, ou inversement).
  if not (p_starts_at = v_request.requested_end or p_ends_at = v_request.requested_start) then
    raise exception 'Les créneaux doivent être consécutifs.';
  end if;

  select * into v_property from public.properties where id = v_request.property_id and status = 'approved';
  if not found then
    raise exception 'Cette résidence n''est pas disponible.';
  end if;

  v_booking_id := gen_random_uuid();

  insert into public.bookings (id, booking_code, property_id, type, status, starts_at, ends_at, total_price, currency, created_by)
  values (
    v_booking_id,
    public.generate_booking_code(),
    v_request.property_id,
    'shared',
    'pending',
    least(v_request.requested_start, p_starts_at),
    greatest(v_request.requested_end, p_ends_at),
    p_price_initiator + p_price_joiner,
    v_property.currency,
    v_request.initiator_profile_id
  );

  if v_request.requested_start < p_starts_at then
    insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
    values
      (v_booking_id, v_request.property_id, v_request.initiator_profile_id, 1, v_request.requested_start, v_request.requested_end, 'pending', p_price_initiator),
      (v_booking_id, v_request.property_id, v_profile_id, 2, p_starts_at, p_ends_at, 'pending', p_price_joiner);
  else
    insert into public.booking_segments (booking_id, property_id, participant_profile_id, segment_order, starts_at, ends_at, status, price_share)
    values
      (v_booking_id, v_request.property_id, v_profile_id, 1, p_starts_at, p_ends_at, 'pending', p_price_joiner),
      (v_booking_id, v_request.property_id, v_request.initiator_profile_id, 2, v_request.requested_start, v_request.requested_end, 'pending', p_price_initiator);
  end if;

  update public.shared_booking_requests
    set status = 'converted', booking_id = v_booking_id, updated_at = now()
    where id = p_request_id;

  perform public.write_audit_log(v_profile_id, 'shared_booking_matched', 'booking', v_booking_id, null, null);

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Le créneau sélectionné n''est plus disponible.';
end;
$$;

grant execute on function public.join_shared_booking_request(uuid, timestamptz, timestamptz, numeric, numeric) to authenticated;

-- Paiement Mobile Money manuel, étape client (§12): "J'ai effectué le paiement."
create or replace function public.submit_payment(p_payment_id uuid)
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
  if v_payment.status <> 'pending' then
    raise exception 'Le paiement n''a pas encore été confirmé.';
  end if;

  update public.payments
    set status = 'payment_submitted', submitted_at = now(), updated_at = now()
    where id = p_payment_id;

  perform public.write_audit_log(v_profile_id, 'payment_submitted', 'payment', p_payment_id, null, null);
end;
$$;

grant execute on function public.submit_payment(uuid) to authenticated;

-- Paiement Mobile Money manuel, étape Super Admin (§12): vérification hors-bande sur le
-- compte Mobile Money, puis confirmation. "Paiement reçu" ne signifie PAS "résidence
-- réservée" (§13) : ceci ne fait avancer que le statut financier du booking.
create or replace function public.confirm_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_payment record;
  v_pending_count int;
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
    set status = 'payment_confirmed', confirmed_at = now(), confirmed_by = v_admin_id, updated_at = now()
    where id = p_payment_id;

  perform public.write_audit_log(v_admin_id, 'payment_confirmed', 'payment', p_payment_id, null, null);

  select count(*) into v_pending_count
    from public.payments
    where booking_id = v_payment.booking_id and status <> 'payment_confirmed';

  if v_pending_count = 0 then
    update public.bookings
      set status = 'payment_received', updated_at = now()
      where id = v_payment.booking_id and status in ('pending', 'awaiting_payment');
  end if;
end;
$$;

grant execute on function public.confirm_payment(uuid) to authenticated;
