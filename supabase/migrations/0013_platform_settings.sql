-- Single source of truth for platform branding + Mobile Money configuration (§3, §31, §32).
-- Never hard-code the Mobile Money number or commission anywhere else in the codebase.
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create trigger set_platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

insert into public.platform_settings (key, value) values
  ('platform_name', '"Residence Pro"'),
  ('logo_url', 'null'),
  ('primary_color', '"#0f766e"'),
  ('contact_email', 'null'),
  ('contact_phone', 'null'),
  ('payment_operator', 'null'),
  ('payment_phone', 'null'),
  ('payment_recipient_name', 'null'),
  ('payment_instructions', 'null'),
  ('commission_type', '"percentage"'),
  ('commission_value', '10'),
  ('shared_request_expiry_hours', '24'),
  ('payment_pending_expiry_hours', '48'),
  ('owner_confirmation_expiry_hours', '24')
on conflict (key) do nothing;
