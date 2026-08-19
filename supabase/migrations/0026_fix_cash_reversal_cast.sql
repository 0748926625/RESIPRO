-- Testing 0025 against the live database found that reverse_cash_transaction() failed
-- with "column type is of type cash_transaction_type but expression is of type text":
-- the CASE expression choosing the opposite direction evaluates as text by default, and
-- Postgres does not implicitly cast a plain string literal to an enum on INSERT.
create or replace function public.reverse_cash_transaction(p_transaction_id uuid, p_reason text default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_original record;
  v_reversal_id uuid;
begin
  if v_profile_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_original from public.cash_transactions where id = p_transaction_id;
  if not found then
    raise exception 'cash transaction not found';
  end if;

  if not public.owns_property(v_original.property_id) and not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if exists (select 1 from public.cash_transactions where reversal_of = p_transaction_id) then
    raise exception 'Cette opération a déjà été annulée.';
  end if;

  insert into public.cash_transactions (property_id, type, amount, reason, performed_by, reversal_of)
  values (
    v_original.property_id,
    (case when v_original.type = 'in' then 'out' else 'in' end)::public.cash_transaction_type,
    v_original.amount,
    coalesce(p_reason, 'Annulation de : ' || v_original.reason),
    v_profile_id,
    p_transaction_id
  )
  returning id into v_reversal_id;

  return v_reversal_id;
end;
$$;

grant execute on function public.reverse_cash_transaction(uuid, text) to authenticated;
