begin;

create or replace function public.can_read_product_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.product_images pi
    join public.products p on p.id = pi.product_id
    where pi.storage_path = object_name
      and p.active
  );
$$;

revoke all on function public.can_read_product_image(text) from public;
grant execute on function public.can_read_product_image(text) to anon, authenticated;

drop policy if exists product_images_storage_catalog_read on storage.objects;
create policy product_images_storage_catalog_read
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'product-images'
  and (public.is_admin() or public.can_read_product_image(name))
);

commit;
