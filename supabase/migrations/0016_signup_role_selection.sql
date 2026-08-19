-- Registration lets a visitor choose "client" or "owner" (§25, §4). "super_admin" is
-- never self-assignable through user metadata — the frontend cannot be trusted for
-- authorization (§53), so this is enforced here, not just by hiding the option in the UI.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when new.raw_user_meta_data->>'role' = 'owner' then 'owner'::public.user_role
    else 'client'::public.user_role
  end;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );

  if v_role = 'owner' then
    insert into public.owners (profile_id) values (new.id);
  else
    insert into public.clients (profile_id) values (new.id);
  end if;

  return new;
end;
$$;
