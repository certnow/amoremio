do $$
declare
  v_missing_rls text[];
begin
  select array_agg(tablename order by tablename)
  into v_missing_rls
  from pg_tables
  where schemaname = 'public'
    and tablename = any (array[
      'categories', 'products', 'product_images', 'product_variants',
      'profiles', 'customers', 'orders', 'order_items',
      'store_settings', 'display_spots'
    ])
    and not rowsecurity;

  if v_missing_rls is not null then
    raise exception 'RLS desativado nas tabelas: %', array_to_string(v_missing_rls, ', ');
  end if;
end;
$$;

do $$
declare
  v_public_write_policies integer;
begin
  select count(*)
  into v_public_write_policies
  from pg_policies
  where schemaname = 'public'
    and 'anon' = any (roles)
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  if v_public_write_policies > 0 then
    raise exception 'Foram encontradas políticas públicas de escrita direta';
  end if;
end;
$$;

select
  p.proname,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin', 'create_guest_order')
order by p.proname;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'product-images';
