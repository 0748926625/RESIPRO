-- Centralized status/role enums. Keep in sync with src/lib/constants/{roles,statuses}.ts.

create type public.user_role as enum ('super_admin', 'owner', 'client');

create type public.property_status as enum (
  'draft', 'pending_review', 'approved', 'rejected', 'suspended', 'archived'
);

create type public.manager_phone_visibility as enum ('hidden', 'admin_only', 'revealed');

create type public.booking_type as enum ('classic', 'shared');

create type public.booking_status as enum (
  'draft', 'pending', 'awaiting_payment', 'payment_received',
  'awaiting_owner_confirmation', 'confirmed', 'checked_in', 'checked_out',
  'completed', 'cancelled', 'rejected', 'expired'
);

create type public.segment_status as enum ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');

create type public.shared_request_status as enum (
  'searching_partner', 'partner_found', 'expired', 'cancelled', 'converted'
);

create type public.payment_status as enum (
  'pending', 'payment_submitted', 'payment_confirmed', 'payment_rejected'
);

create type public.intermediation_status as enum (
  'new', 'contacted', 'residence_found', 'client_referred', 'reservation_created', 'completed', 'cancelled'
);

create type public.cash_transaction_type as enum ('in', 'out');

create type public.availability_block_reason as enum ('maintenance', 'cleaning', 'manual', 'other');

create type public.commission_type as enum ('fixed', 'percentage');
