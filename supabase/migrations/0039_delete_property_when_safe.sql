-- "Supprimer" should mean gone, not archived, whenever that's actually safe. A property
-- that has never had a single booking (or shared request) has nothing that FK-restricts
-- its deletion — property_images/property_amenities/availability_*/expenses/
-- income_transactions/recurring_charges/cash_transactions/external_bookings all cascade on
-- property_id (0004-0010, 0032). bookings.property_id and shared_booking_requests.property_id
-- do NOT cascade (0007, 0008) by design, so a property with booking history still can't be
-- hard-deleted without destroying payment/audit records — archiving remains the fallback for
-- that case, catching the FK violation rather than pre-checking every referencing table
-- (robust against future schema additions too).
-- Return type changes from void (0038) to text — CREATE OR REPLACE can't change that.
drop function if exists public.archive_property(uuid);

create function public.archive_property(p_property_id uuid) returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_old_status public.property_status;
begin
  if not public.owns_property(p_property_id) then
    raise exception 'not authorized';
  end if;

  select status into v_old_status from public.properties where id = p_property_id for update;
  if not found then
    raise exception 'property not found';
  end if;

  if v_old_status = 'archived' then
    raise exception 'Cette résidence est déjà archivée.';
  end if;

  if exists (
    select 1 from public.bookings
    where property_id = p_property_id
      and ends_at > now()
      and status not in ('cancelled', 'rejected', 'expired')
  ) then
    raise exception 'Impossible de supprimer : il reste des réservations à venir sur cette résidence.';
  end if;

  begin
    delete from public.properties where id = p_property_id;

    perform public.write_audit_log(
      v_profile_id,
      'property_deleted',
      'property',
      p_property_id,
      jsonb_build_object('status', v_old_status),
      null
    );

    return 'deleted';
  exception
    when foreign_key_violation then
      update public.properties set status = 'archived' where id = p_property_id;

      perform public.write_audit_log(
        v_profile_id,
        'property_archived',
        'property',
        p_property_id,
        jsonb_build_object('status', v_old_status),
        jsonb_build_object('status', 'archived')
      );

      return 'archived';
  end;
end;
$$;

grant execute on function public.archive_property(uuid) to authenticated;
