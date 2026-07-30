begin;

update storage.buckets
set public = false
where id = 'product-images';

drop policy if exists product_images_storage_catalog_read on storage.objects;
create policy product_images_storage_catalog_read
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'product-images'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.products p
      where p.active
        and p.id::text = split_part(name, '/', 1)
    )
  )
);

commit;
