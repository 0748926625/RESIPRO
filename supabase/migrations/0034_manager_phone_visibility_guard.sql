-- properties_owner_update (0015) lets an owner UPDATE any row they own with no
-- column-level restriction — including manager_phone_visibility directly, e.g. via a
-- raw PostgREST call from the browser (anon key + the owner's own session) bypassing
-- PropertyForm entirely, which no longer exposes this field but can't stop a crafted
-- request on its own. Only the Super Admin may change it: it's the intermediation
-- monetization lever (§6) — an owner must never be able to self-reveal their phone to a
-- client. Same pattern as enforce_property_status_transition() (0020).
create or replace function public.enforce_manager_phone_visibility()
returns trigger
language plpgsql
as $$
begin
  if new.manager_phone_visibility = old.manager_phone_visibility then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  raise exception 'Seul le Super Admin peut modifier la visibilité de ce numéro.';
end;
$$;

create trigger trg_enforce_manager_phone_visibility
  before update of manager_phone_visibility on public.properties
  for each row execute function public.enforce_manager_phone_visibility();

-- Admin-side entry point: revealing an owner's phone to a client is the intermediation
-- monetization lever, so it's a sensitive action worth a paper trail (§30), same as
-- set_property_status (0027).
create or replace function public.set_manager_phone_visibility(
  p_property_id uuid,
  p_visibility public.manager_phone_visibility
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_old public.manager_phone_visibility;
begin
  if not exists (select 1 from public.profiles where id = v_admin_id and role = 'super_admin') then
    raise exception 'not authorized';
  end if;

  select manager_phone_visibility into v_old from public.properties where id = p_property_id for update;
  if not found then
    raise exception 'property not found';
  end if;

  update public.properties set manager_phone_visibility = p_visibility where id = p_property_id;

  perform public.write_audit_log(
    v_admin_id,
    'manager_phone_visibility_changed',
    'property',
    p_property_id,
    jsonb_build_object('manager_phone_visibility', v_old),
    jsonb_build_object('manager_phone_visibility', p_visibility)
  );
end;
$$;

grant execute on function public.set_manager_phone_visibility(uuid, public.manager_phone_visibility) to authenticated;
