-- "Delete a residence" (owner-facing) is a soft delete: property_status already has an
-- 'archived' value (0002) that nothing could reach yet — enforce_property_status_transition
-- (0020) only let an owner move draft/rejected -> pending_review, anything else raised
-- "Seul le Super Admin...". A hard DELETE isn't an option: bookings.property_id and
-- shared_booking_requests.property_id have no ON DELETE CASCADE (0007, 0008) by design, so
-- it would either fail outright or (if cascaded) destroy booking/payment history that must
-- survive for audit purposes. Archiving instead: getApprovedProperty already filters on
-- status = 'approved', so an archived residence disappears from public listings/search and
-- new bookings immediately, while the owner keeps full access to its history (finance,
-- invoices, past bookings).

create or replace function public.enforce_property_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if public.owns_property(new.id) then
    if old.status in ('draft', 'rejected') and new.status = 'pending_review' then
      return new;
    end if;
    if new.status = 'archived' and old.status <> 'archived' then
      return new;
    end if;
    raise exception 'Seul le Super Admin peut valider, refuser ou suspendre une résidence.';
  end if;

  raise exception 'not authorized';
end;
$$;

-- Routed through a SECURITY DEFINER function (mirrors set_property_status, 0019) so the
-- "no live booking" guard and the audit log write happen atomically with the transition,
-- and so an owner can't archive around a client's upcoming stay via a raw PostgREST UPDATE.
create or replace function public.archive_property(p_property_id uuid) returns void
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

  update public.properties set status = 'archived' where id = p_property_id;

  perform public.write_audit_log(
    v_profile_id,
    'property_archived',
    'property',
    p_property_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'archived')
  );
end;
$$;

grant execute on function public.archive_property(uuid) to authenticated;
