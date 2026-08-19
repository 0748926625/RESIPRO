-- Photos are non-sensitive marketing content (§6), so the bucket is public-read: the
-- marketplace can render them via a plain public URL with no auth round-trip. Writes are
-- still scoped by RLS to the owning owner or the admin, keyed off the property_id that
-- must be the first path segment (property-images/{property_id}/{filename}).
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

create policy "property_images_storage_select" on storage.objects
  for select
  using (bucket_id = 'property-images');

create policy "property_images_storage_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'property-images'
    and (public.owns_property(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "property_images_storage_update" on storage.objects
  for update
  using (
    bucket_id = 'property-images'
    and (public.owns_property(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );

create policy "property_images_storage_delete" on storage.objects
  for delete
  using (
    bucket_id = 'property-images'
    and (public.owns_property(((storage.foldername(name))[1])::uuid) or public.is_admin())
  );
