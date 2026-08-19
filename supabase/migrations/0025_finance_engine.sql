-- Phase 11: the finance tables (expenses, income_transactions, recurring_charges,
-- cash_transactions) and their RLS have existed since 0010/0015, but nothing ever wrote
-- to income_transactions — confirming a payment (Phase 9) had no effect on the owner's
-- revenue ledger. This closes that gap and adds the one write path §19 requires instead
-- of deletion: a reversal that creates an inverse cash_transactions row rather than
-- removing anything.

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

  -- §18: a confirmed payment is booking revenue for the property's owner, recorded
  -- automatically so they don't have to re-enter it by hand.
  insert into public.income_transactions (property_id, booking_id, source, amount, currency, income_date, recorded_by)
  values (v_booking.property_id, v_booking.id, 'booking', v_payment.amount, v_payment.currency, current_date, v_admin_id);

  perform public.write_audit_log(v_admin_id, 'payment_confirmed', 'payment', p_payment_id, null, null);

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

-- §19: "ne jamais supprimer silencieusement une opération financière... utiliser une
-- opération inverse". Only the owner of the property (or admin) may reverse one of their
-- own cash entries; the original row is left untouched and permanently in the ledger.
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
    case when v_original.type = 'in' then 'out' else 'in' end,
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
