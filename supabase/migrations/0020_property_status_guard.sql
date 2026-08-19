-- properties_owner_update (0015) lets an owner UPDATE any row they own with no
-- column-level restriction — including `status` directly, e.g. via a raw PostgREST call
-- from the browser bypassing the app's UI entirely. That would let an owner
-- self-approve/reinstate their own listing, defeating the Super Admin validation
-- workflow that is central to the product (§4A, §37). RLS alone can't express "this
-- column may only take these values for this role," so a trigger enforces it instead.
--
-- auth.uid() reads the JWT claim set by PostgREST for the current request, not the
-- executing Postgres role — so this correctly recognizes an admin acting through
-- set_property_status() (0019, SECURITY DEFINER) as an admin, even though that function
-- runs as its owning role.
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
    raise exception 'Seul le Super Admin peut valider, refuser ou suspendre une résidence.';
  end if;

  raise exception 'not authorized';
end;
$$;

create trigger trg_enforce_property_status_transition
  before update of status on public.properties
  for each row execute function public.enforce_property_status_transition();
