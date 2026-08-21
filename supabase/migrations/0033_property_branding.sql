-- Per-residence branding: a logo and a signature image (captured via the device camera
-- from the owner's side), shown on that residence's invoices. Reuses the existing public
-- "property-images" storage bucket and its owns_property()-scoped RLS — no new bucket or
-- policies needed, since access is keyed off the {property_id}/... path prefix already.
alter table public.properties add column logo_url text;
alter table public.properties add column signature_url text;
