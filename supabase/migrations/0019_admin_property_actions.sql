-- Property status transitions are admin-only and must be audited (§30, §37). Routed
-- through a SECURITY DEFINER function rather than a direct client UPDATE so the role
-- check and the audit log write happen atomically with the transition, and so
-- write_audit_log() (locked down to internal callers only in 0017) stays reachable.
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
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  select status into v_old_status from public.properties where id = p_property_id for update;
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
end;
$$;

grant execute on function public.set_property_status(uuid, public.property_status, public.property_status[]) to authenticated;
