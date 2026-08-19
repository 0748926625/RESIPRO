-- Row Level Security (§24): every sensitive table is scoped so an owner only sees their
-- own residences/bookings/finances, a client only sees their own data, and the Super
-- Admin sees everything. Writes to booking-critical tables happen through the
-- SECURITY DEFINER functions in 0014, not through direct client INSERT/UPDATE.

create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'super_admin', false);
$$;

create or replace function public.owns_property(p_property_id uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.properties p
    join public.owners o on o.id = p.owner_id
    where p.id = p_property_id and o.profile_id = auth.uid()
  );
$$;

-- profiles
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- owners
alter table public.owners enable row level security;

create policy "owners_select_own_or_admin" on public.owners
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "owners_insert_own" on public.owners
  for insert with check (profile_id = auth.uid());

create policy "owners_update_own_or_admin" on public.owners
  for update using (profile_id = auth.uid() or public.is_admin());

-- clients
alter table public.clients enable row level security;

create policy "clients_select_own_or_admin" on public.clients
  for select using (profile_id = auth.uid() or public.is_admin());

create policy "clients_insert_own" on public.clients
  for insert with check (profile_id = auth.uid());

create policy "clients_update_own_or_admin" on public.clients
  for update using (profile_id = auth.uid() or public.is_admin());

-- properties (§37: only "approved" residences are public)
alter table public.properties enable row level security;

create policy "properties_select_public_approved" on public.properties
  for select using (status = 'approved' or public.owns_property(id) or public.is_admin());

create policy "properties_owner_insert" on public.properties
  for insert with check (
    public.is_admin() or owner_id in (select id from public.owners where profile_id = auth.uid())
  );

create policy "properties_owner_update" on public.properties
  for update using (public.owns_property(id) or public.is_admin());

create policy "properties_owner_delete" on public.properties
  for delete using (public.owns_property(id) or public.is_admin());

-- property_images
alter table public.property_images enable row level security;

create policy "property_images_select" on public.property_images
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.status = 'approved' or public.owns_property(p.id) or public.is_admin())
    )
  );

create policy "property_images_manage" on public.property_images
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

-- amenities (public catalog, admin-managed)
alter table public.amenities enable row level security;

create policy "amenities_select_all" on public.amenities for select using (true);

create policy "amenities_admin_write" on public.amenities
  for all using (public.is_admin()) with check (public.is_admin());

-- property_amenities
alter table public.property_amenities enable row level security;

create policy "property_amenities_select" on public.property_amenities
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.status = 'approved' or public.owns_property(p.id) or public.is_admin())
    )
  );

create policy "property_amenities_manage" on public.property_amenities
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

-- availability_rules / availability_blocks: public read (needed to compute availability
-- on the marketplace), write restricted to the owning owner or the admin.
alter table public.availability_rules enable row level security;

create policy "availability_rules_select" on public.availability_rules
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.status = 'approved' or public.owns_property(p.id) or public.is_admin())
    )
  );

create policy "availability_rules_manage" on public.availability_rules
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

alter table public.availability_blocks enable row level security;

create policy "availability_blocks_select" on public.availability_blocks
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.status = 'approved' or public.owns_property(p.id) or public.is_admin())
    )
  );

create policy "availability_blocks_manage" on public.availability_blocks
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

-- bookings: no direct insert policy for clients — creation only goes through
-- create_classic_booking / join_shared_booking_request (SECURITY DEFINER, bypasses RLS).
alter table public.bookings enable row level security;

create policy "bookings_select" on public.bookings
  for select using (
    public.is_admin()
    or public.owns_property(property_id)
    or exists (
      select 1 from public.booking_segments s
      where s.booking_id = bookings.id and s.participant_profile_id = auth.uid()
    )
  );

create policy "bookings_update_admin" on public.bookings
  for update using (public.is_admin());

create policy "bookings_update_owner" on public.bookings
  for update using (public.owns_property(property_id))
  with check (public.owns_property(property_id));

-- booking_segments: read-only from the client side; writes only via RPC functions.
alter table public.booking_segments enable row level security;

create policy "booking_segments_select" on public.booking_segments
  for select using (
    public.is_admin()
    or participant_profile_id = auth.uid()
    or public.owns_property(property_id)
  );

-- shared_booking_requests: an open request ("searching_partner") is discoverable so a
-- second participant can find and join it (§10); everything else is scoped to the
-- initiator, the property owner, or the admin.
alter table public.shared_booking_requests enable row level security;

create policy "shared_requests_select" on public.shared_booking_requests
  for select using (
    status = 'searching_partner'
    or initiator_profile_id = auth.uid()
    or public.is_admin()
    or public.owns_property(property_id)
  );

create policy "shared_requests_update_own_or_admin" on public.shared_booking_requests
  for update using (initiator_profile_id = auth.uid() or public.is_admin());

-- payments: read-only from the client side; writes only via submit_payment / confirm_payment.
alter table public.payments enable row level security;

create policy "payments_select" on public.payments
  for select using (
    payer_profile_id = auth.uid()
    or public.is_admin()
    or public.owns_property((select b.property_id from public.bookings b where b.id = booking_id))
  );

-- expense_categories (public read, admin-managed)
alter table public.expense_categories enable row level security;

create policy "expense_categories_select" on public.expense_categories for select using (true);

create policy "expense_categories_admin_write" on public.expense_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- expenses / recurring_charges / income_transactions / cash_transactions: owner-of-property
-- or admin only (§16, §18, §19 — a client has no access to another party's finances).
alter table public.expenses enable row level security;

create policy "expenses_owner_admin" on public.expenses
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

alter table public.recurring_charges enable row level security;

create policy "recurring_charges_owner_admin" on public.recurring_charges
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

alter table public.income_transactions enable row level security;

create policy "income_owner_admin" on public.income_transactions
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

alter table public.cash_transactions enable row level security;

create policy "cash_owner_admin" on public.cash_transactions
  for all using (public.owns_property(property_id) or public.is_admin())
  with check (public.owns_property(property_id) or public.is_admin());

-- intermediation_requests (§15): a client only sees their own requests, the admin sees all.
alter table public.intermediation_requests enable row level security;

create policy "intermediation_select" on public.intermediation_requests
  for select using (client_profile_id = auth.uid() or public.is_admin());

create policy "intermediation_insert" on public.intermediation_requests
  for insert with check (client_profile_id = auth.uid() or client_profile_id is null);

create policy "intermediation_admin_manage" on public.intermediation_requests
  for update using (public.is_admin());

-- notifications: a user only ever sees their own; inserts happen server-side (admin client).
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (profile_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (profile_id = auth.uid());

-- audit_logs: admin-only, insert exclusively through write_audit_log().
alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_admin());

-- platform_settings: readable by everyone (needed to render contact/payment info
-- publicly), writable only by the Super Admin.
alter table public.platform_settings enable row level security;

create policy "platform_settings_select_all" on public.platform_settings
  for select using (true);

create policy "platform_settings_admin_write" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());
