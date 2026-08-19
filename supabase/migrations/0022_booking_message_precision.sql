-- Testing 0021 against the live database revealed that a genuine double-booking on the
-- exact same slot surfaced the cleaning-buffer message ("délai de préparation...")
-- instead of the intended "cette résidence vient d'être réservée" message, because the
-- buffer check (which uses an expanded range) ran first and a direct overlap is by
-- definition also a buffer-range overlap. Split the checks so a genuine overlap is
-- reported distinctly from a mere buffer-proximity issue (§42: error messages must be
-- understandable, and these two situations are not the same to the user).
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

  -- Direct overlap with another active segment: checked ahead of the buffer check below
  -- so this exact situation gets its own message instead of being masked by it.
  if exists (
    select 1 from public.booking_segments s
    where s.property_id = p_property_id
      and s.status <> 'cancelled'
      and tstzrange(s.starts_at, s.ends_at) && tstzrange(p_starts_at, p_ends_at)
  ) then
    raise exception 'Cette résidence vient d''être réservée par un autre utilisateur.';
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

  -- Belt-and-suspenders: the EXCLUDE constraint is the actual race-condition guard for
  -- two concurrent requests that both pass the checks above before either commits.
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
