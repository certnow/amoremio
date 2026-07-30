begin;

alter table public.product_images
  add column if not exists storage_path text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

update public.product_images
set storage_path = substring(image_url from '/product-images/(.+)$')
where storage_path is null
  and image_url like '%/storage/v1/object/public/product-images/%';

with ranked as (
  select id, row_number() over (
    partition by product_id
    order by position, created_at, id
  ) as image_rank
  from public.product_images
)
update public.product_images pi
set is_primary = (ranked.image_rank = 1)
from ranked
where pi.id = ranked.id;

create unique index if not exists product_images_one_primary_idx
  on public.product_images (product_id)
  where is_primary;

alter table public.product_variants
  add column if not exists image_id uuid references public.product_images(id) on delete set null;

create or replace function public.reorder_product_images(
  target_product_id uuid,
  ordered_image_ids uuid[],
  primary_image_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  image_id uuid;
  image_position integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem ordenar imagens';
  end if;

  if coalesce(array_length(ordered_image_ids, 1), 0) = 0 then
    return;
  end if;

  if primary_image_id is null or not (primary_image_id = any(ordered_image_ids)) then
    raise exception 'A imagem principal precisa pertencer à galeria';
  end if;

  if exists (
    select 1 from unnest(ordered_image_ids) supplied_id
    where not exists (
      select 1 from public.product_images pi
      where pi.id = supplied_id and pi.product_id = target_product_id
    )
  ) then
    raise exception 'A galeria contém uma imagem inválida';
  end if;

  update public.product_images
  set is_primary = false,
      position = position + 100000
  where product_id = target_product_id;

  foreach image_id in array ordered_image_ids loop
    update public.product_images
    set position = image_position,
        is_primary = (id = primary_image_id)
    where id = image_id and product_id = target_product_id;
    image_position := image_position + 1;
  end loop;
end;
$$;

revoke all on function public.reorder_product_images(uuid, uuid[], uuid) from public;
grant execute on function public.reorder_product_images(uuid, uuid[], uuid) to authenticated;

update storage.buckets
set public = false,
    file_size_limit = 6291456,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';

drop policy if exists product_images_storage_public_read on storage.objects;
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
        and p.id::text = (storage.foldername(name))[1]
    )
  )
);

commit;
