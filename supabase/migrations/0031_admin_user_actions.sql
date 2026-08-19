-- Admin actions on user accounts and owner verification. Both are sensitive (§30: every
-- sensitive action must be traceable), and audit_logs only accepts inserts from
-- write_audit_log() (see 0015_rls_policies.sql) — so these go through SECURITY DEFINER
-- functions rather than a direct table update from the client, same pattern as
-- set_property_status (0027_notifications_engine.sql).

create or replace function public.set_profile_status(p_profile_id uuid, p_new_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_old_status text;
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  if p_new_status not in ('active', 'suspended') then
    raise exception 'invalid status';
  end if;

  if p_profile_id = v_admin_id then
    raise exception 'cannot change your own status';
  end if;

  select status into v_old_status from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'profile not found';
  end if;

  update public.profiles set status = p_new_status where id = p_profile_id;

  perform public.write_audit_log(
    v_admin_id,
    'profile_status_changed',
    'profile',
    p_profile_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status)
  );
end;
$$;

grant execute on function public.set_profile_status(uuid, text) to authenticated;

create or replace function public.set_owner_verified(p_owner_id uuid, p_verified boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_old_verified boolean;
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  select verified into v_old_verified from public.owners where id = p_owner_id for update;
  if not found then
    raise exception 'owner not found';
  end if;

  update public.owners set verified = p_verified where id = p_owner_id;

  perform public.write_audit_log(
    v_admin_id,
    'owner_verification_changed',
    'owner',
    p_owner_id,
    jsonb_build_object('verified', v_old_verified),
    jsonb_build_object('verified', p_verified)
  );
end;
$$;

grant execute on function public.set_owner_verified(uuid, boolean) to authenticated;
