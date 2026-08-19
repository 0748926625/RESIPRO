-- Phase 14: notifications (0012) has existed since Phase 1 but nothing ever wrote to it —
-- same shape of gap as payments/income_transactions before Phases 9/11. Hooks the
-- booking/payment/property lifecycle into it (§29).

-- Internal-only helper, mirroring write_audit_log: never granted to authenticated,
-- reachable only from inside other SECURITY DEFINER functions.
create or replace function public.create_notification(
  p_profile_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language sql
security definer set search_path = public
as $$
  insert into public.notifications (profile_id, type, title, body, related_entity_type, related_entity_id)
  values (p_profile_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
$$;

revoke execute on function public.create_notification(uuid, text, text, text, text, uuid) from public;

-- Fans a notification out to every Super Admin — used for platform-facing alerts
-- (payment to verify, new intermediation request) rather than a single recipient.
create or replace function public.notify_admins(
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin record;
begin
  for v_admin in select id from public.profiles where role = 'super_admin' loop
    perform public.create_notification(v_admin.id, p_type, p_title, p_body, p_entity_type, p_entity_id);
  end loop;
end;
$$;

revoke execute on function public.notify_admins(text, text, text, text, uuid) from public;

create or replace function public.notify_property_owner(
  p_property_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_profile_id uuid;
begin
  select o.profile_id into v_owner_profile_id
    from public.properties p join public.owners o on o.id = p.owner_id
    where p.id = p_property_id;

  if v_owner_profile_id is not null then
    perform public.create_notification(v_owner_profile_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
  end if;
end;
$$;

revoke execute on function public.notify_property_owner(uuid, text, text, text, text, uuid) from public;

-- New intermediation request: no RPC to hook (it's a direct client insert protected by
-- RLS), so a trigger is the natural place instead.
create or replace function public.trg_notify_admins_new_intermediation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.notify_admins(
    'new_intermediation',
    'Nouvelle demande d''intermédiation',
    new.full_name || ' — ' || coalesce(new.requested_city, 'ville non précisée'),
    'intermediation_request',
    new.id
  );
  return new;
end;
$$;

create trigger notify_admins_on_new_intermediation
  after insert on public.intermediation_requests
  for each row execute function public.trg_notify_admins_new_intermediation();

-- create_classic_booking: notify the owner of the new booking and the client that
-- payment is now expected.
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

  perform public.notify_property_owner(p_property_id, 'new_booking', 'Nouvelle réservation : ' || v_booking_code, null, 'booking', v_booking_id);
  perform public.create_notification(v_profile_id, 'payment_requested', 'Paiement demandé pour ' || v_booking_code, 'Référence ' || v_booking_code || '-A', 'booking', v_booking_id);

  return v_booking_id;
exception
  when exclusion_violation then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
end;
$$;

grant execute on function public.create_classic_booking(uuid, timestamptz, timestamptz) to authenticated;

-- join_shared_booking_request: notify the initiator a partner was found, the owner of
-- the new shared booking, and both participants that payment is expected.
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

-- submit_payment: notify every admin there's a payment to verify.
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
  perform public.notify_admins('payment_submitted', 'Paiement à vérifier : ' || v_payment.reference_code, null, 'payment', p_payment_id);
end;
$$;

grant execute on function public.submit_payment(uuid) to authenticated;

-- confirm_payment: notify the payer their payment cleared.
create or replace function public.confirm_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_payment record;
  v_booking record;
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

  select * into v_booking from public.bookings where id = v_payment.booking_id;

  update public.payments
    set status = 'payment_confirmed', confirmed_at = now(), confirmed_by = v_admin_id, updated_at = now()
    where id = p_payment_id;

  insert into public.income_transactions (property_id, booking_id, source, amount, currency, income_date, recorded_by)
  values (v_booking.property_id, v_booking.id, 'booking', v_payment.amount, v_payment.currency, current_date, v_admin_id);

  perform public.write_audit_log(v_admin_id, 'payment_confirmed', 'payment', p_payment_id, null, null);
  perform public.create_notification(v_payment.payer_profile_id, 'payment_confirmed', 'Paiement confirmé : ' || v_payment.reference_code, null, 'payment', p_payment_id);

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

-- reject_payment: notify the payer so they know to fix and resubmit.
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
  perform public.create_notification(v_payment.payer_profile_id, 'payment_rejected', 'Paiement refusé : ' || v_payment.reference_code, p_note, 'payment', p_payment_id);
end;
$$;

grant execute on function public.reject_payment(uuid, text) to authenticated;

-- cancel_booking: notify the other participant(s) and the owner.
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_booking record;
  v_is_participant boolean;
  v_other record;
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

  for v_other in
    select distinct participant_profile_id from public.booking_segments where booking_id = p_booking_id
  loop
    perform public.create_notification(v_other.participant_profile_id, 'booking_cancelled', 'Réservation annulée : ' || v_booking.booking_code, null, 'booking', p_booking_id);
  end loop;
  perform public.notify_property_owner(v_booking.property_id, 'booking_cancelled', 'Réservation annulée : ' || v_booking.booking_code, null, 'booking', p_booking_id);
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

-- admin_mark_booking_reserved_with_owner: prompt the owner to confirm.
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
  perform public.notify_property_owner(v_booking.property_id, 'booking_awaiting_confirmation', 'Réservation à confirmer : ' || v_booking.booking_code, null, 'booking', p_booking_id);
end;
$$;

grant execute on function public.admin_mark_booking_reserved_with_owner(uuid) to authenticated;

-- owner_confirm_booking: notify every participant the booking is now confirmed.
create or replace function public.owner_confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_booking record;
  v_participant record;
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

  for v_participant in
    select distinct participant_profile_id from public.booking_segments where booking_id = p_booking_id
  loop
    perform public.create_notification(v_participant.participant_profile_id, 'booking_confirmed', 'Réservation confirmée : ' || v_booking.booking_code, null, 'booking', p_booking_id);
  end loop;
end;
$$;

grant execute on function public.owner_confirm_booking(uuid) to authenticated;

-- set_property_status: notify the owner of the outcome.
create or replace function public.set_property_status(
  p_property_id uuid,
  p_new_status public.property_status,
  p_allowed_from public.property_status[]
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_old_status public.property_status;
  v_property_name text;
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  select status, name into v_old_status, v_property_name from public.properties where id = p_property_id for update;
  if not found then
    raise exception 'property not found';
  end if;

  if not (v_old_status = any(p_allowed_from)) then
    raise exception 'Transition de statut invalide depuis %', v_old_status;
  end if;

  update public.properties set status = p_new_status where id = p_property_id;

  perform public.write_audit_log(
    v_admin_id,
    'property_status_changed',
    'property',
    p_property_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status)
  );

  perform public.notify_property_owner(
    p_property_id,
    'property_status_changed',
    'Résidence ' || v_property_name || ' : ' || p_new_status::text,
    null,
    'property',
    p_property_id
  );
end;
$$;

grant execute on function public.set_property_status(uuid, public.property_status, public.property_status[]) to authenticated;
