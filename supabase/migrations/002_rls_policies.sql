begin;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.display_spots enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.product_images from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.store_settings from anon, authenticated;
revoke all on table public.display_spots from anon, authenticated;

grant select on table public.categories, public.products, public.product_images,
  public.product_variants, public.store_settings, public.display_spots to anon, authenticated;

grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.categories, public.products,
  public.product_images, public.product_variants, public.customers, public.orders,
  public.order_items, public.store_settings, public.display_spots to authenticated;

create policy categories_public_read
on public.categories for select
to anon, authenticated
using (active or public.is_admin());

create policy categories_admin_insert
on public.categories for insert to authenticated
with check (public.is_admin());
create policy categories_admin_update
on public.categories for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete
on public.categories for delete to authenticated
using (public.is_admin());

create policy products_public_read
on public.products for select
to anon, authenticated
using (
  public.is_admin()
  or (
    active
    and (
      category_id is null
      or exists (select 1 from public.categories c where c.id = category_id and c.active)
    )
  )
);

create policy products_admin_insert
on public.products for insert to authenticated
with check (public.is_admin());
create policy products_admin_update
on public.products for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete
on public.products for delete to authenticated
using (public.is_admin());

create policy product_images_public_read
on public.product_images for select
to anon, authenticated
using (
  public.is_admin()
  or exists (select 1 from public.products p where p.id = product_id and p.active)
);
create policy product_images_admin_insert
on public.product_images for insert to authenticated
with check (public.is_admin());
create policy product_images_admin_update
on public.product_images for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy product_images_admin_delete
on public.product_images for delete to authenticated
using (public.is_admin());

create policy product_variants_public_read
on public.product_variants for select
to anon, authenticated
using (
  public.is_admin()
  or exists (select 1 from public.products p where p.id = product_id and p.active)
);
create policy product_variants_admin_insert
on public.product_variants for insert to authenticated
with check (public.is_admin());
create policy product_variants_admin_update
on public.product_variants for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy product_variants_admin_delete
on public.product_variants for delete to authenticated
using (public.is_admin());

create policy profiles_self_or_admin_read
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy profiles_admin_insert
on public.profiles for insert to authenticated
with check (public.is_admin());
create policy profiles_admin_update
on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_delete
on public.profiles for delete to authenticated
using (public.is_admin());

create policy customers_admin_all
on public.customers for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy orders_admin_all
on public.orders for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy order_items_admin_all
on public.order_items for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy store_settings_public_read
on public.store_settings for select to anon, authenticated
using (true);
create policy store_settings_admin_insert
on public.store_settings for insert to authenticated
with check (public.is_admin());
create policy store_settings_admin_update
on public.store_settings for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy store_settings_admin_delete
on public.store_settings for delete to authenticated
using (public.is_admin());

create policy display_spots_public_read
on public.display_spots for select to anon, authenticated
using (
  public.is_admin()
  or (
    active
    and product_id is not null
    and exists (select 1 from public.products p where p.id = product_id and p.active)
  )
);
create policy display_spots_admin_insert
on public.display_spots for insert to authenticated
with check (public.is_admin());
create policy display_spots_admin_update
on public.display_spots for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy display_spots_admin_delete
on public.display_spots for delete to authenticated
using (public.is_admin());

commit;
