-- Lets an owner share a generated invoice by link (e.g. over WhatsApp) with the client it
-- was made for, who isn't authenticated and has no owns_property() relationship to the
-- property. external_bookings_owner_select (0032) only allows the owner/admin to read it,
-- so a plain anon SELECT is out — and RLS can't be opened with `using (true)` without
-- letting anyone list every owner's client names and amounts via the public anon key.
-- Instead, a SECURITY DEFINER function that takes the exact invoice id and returns only
-- that one row: unguessable UUID, no enumeration, safe to expose to anon.
create or replace function public.get_public_invoice(p_invoice_id uuid)
returns table (
  invoice_id uuid,
  client_name text,
  starts_at date,
  ends_at date,
  nightly_rate numeric,
  amount_paid numeric,
  currency text,
  note text,
  created_at timestamptz,
  property_name text,
  property_city text,
  property_address text,
  logo_url text,
  signature_url text,
  owner_business_name text,
  owner_full_name text,
  owner_phone text
)
language sql
stable
security definer set search_path = public
as $$
  select
    eb.id, eb.client_name, eb.starts_at, eb.ends_at, eb.nightly_rate, eb.amount_paid, eb.currency, eb.note, eb.created_at,
    p.name, p.city, p.address, p.logo_url, p.signature_url,
    o.business_name, pr.full_name, pr.phone
  from public.external_bookings eb
  join public.properties p on p.id = eb.property_id
  left join public.owners o on o.id = p.owner_id
  left join public.profiles pr on pr.id = o.profile_id
  where eb.id = p_invoice_id;
$$;

grant execute on function public.get_public_invoice(uuid) to anon, authenticated;
