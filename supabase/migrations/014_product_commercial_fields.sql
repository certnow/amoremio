begin;

alter table public.products
  add column if not exists sku text,
  add column if not exists material_details text,
  add column if not exists care_instructions text,
  add column if not exists auto_material_in_title boolean not null default true;

update public.products
set sku = 'AMR-' || upper(substr(md5(id::text), 1, 12))
where sku is null or trim(sku) = '';

update public.products
set care_instructions = case
  when lower(coalesce(material, '')) like '%aço inox%' then 'Evite contato prolongado com produtos químicos, perfumes e cremes. Após o uso, limpe delicadamente e guarde em local seco.'
  when lower(coalesce(material, '')) like '%prata 925%' then 'Guarde em local seco e fechado. A prata pode escurecer naturalmente com o tempo e pode ser limpa com produto específico para prata.'
  when lower(coalesce(material, '')) like '%semijoia%' then 'Evite contato com água, perfumes, cremes e produtos químicos. Após o uso, limpe com pano macio e guarde separadamente.'
  when lower(coalesce(material, '')) like '%bijuteria%' then 'Evite água, perfumes, cremes e produtos químicos. Guarde a peça separadamente e em local seco para preservar o acabamento.'
  else 'Evite contato com produtos químicos, perfumes e cremes. Após o uso, limpe delicadamente e guarde em local seco.'
end
where care_instructions is null or trim(care_instructions) = '';

alter table public.products
  alter column sku set not null;

create unique index if not exists products_sku_unique_idx
  on public.products (lower(sku));

alter table public.order_items
  add column if not exists product_sku text,
  add column if not exists product_material text;

update public.order_items oi
set product_sku = p.sku,
    product_material = p.material
from public.products p
where oi.product_id = p.id
  and (oi.product_sku is null or oi.product_material is null);

create or replace function public.create_guest_order(
  p_customer jsonb,
  p_items jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number bigint;
  v_phone text;
  v_name text;
  v_email text;
  v_address text;
  v_shipping numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_item jsonb;
  v_product record;
  v_variant record;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_variant_label text;
begin
  v_name := trim(coalesce(p_customer->>'name', ''));
  v_phone := regexp_replace(coalesce(p_customer->>'phone', ''), '\D', '', 'g');
  v_email := nullif(lower(trim(coalesce(p_customer->>'email', ''))), '');
  v_address := trim(coalesce(p_customer->>'address', ''));
  if char_length(v_name) < 2 then raise exception 'Nome inválido'; end if;
  if char_length(v_phone) < 10 then raise exception 'Telefone inválido'; end if;
  if char_length(v_address) < 8 then raise exception 'Endereço inválido'; end if;
  if v_email is null or v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then raise exception 'E-mail inválido'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'O pedido não possui itens'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'Pedido com itens demais'; end if;

  insert into public.customers (name, phone, normalized_phone, email, address)
  values (v_name, p_customer->>'phone', v_phone, v_email, v_address)
  on conflict (normalized_phone) do update set name=excluded.name,phone=excluded.phone,email=coalesce(excluded.email,public.customers.email),address=excluded.address
  returning id into v_customer_id;
  select default_shipping into v_shipping from public.store_settings where id=true;
  v_shipping := coalesce(v_shipping,0);
  insert into public.orders (customer_id,customer_name,phone,email,address,subtotal,shipping,total,status,notes)
  values (v_customer_id,v_name,p_customer->>'phone',v_email,v_address,0,v_shipping,v_shipping,'pending',nullif(trim(coalesce(p_notes,'')),''))
  returning id,order_number into v_order_id,v_order_number;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_product_id := (v_item->>'product_id')::uuid;
      v_variant_id := nullif(v_item->>'variant_id','')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    exception when others then raise exception 'Item inválido'; end;
    if v_quantity < 1 or v_quantity > 100 then raise exception 'Quantidade inválida'; end if;
    select id,name,sku,material,price,promotional_price,stock,active into v_product
    from public.products where id=v_product_id for update;
    if not found or not v_product.active then raise exception 'Produto indisponível'; end if;
    if v_product.stock < v_quantity then raise exception 'Estoque insuficiente para %',v_product.name; end if;
    v_unit_price := coalesce(v_product.promotional_price,v_product.price);
    v_variant_label := null;
    if v_variant_id is not null then
      select id,name,value,price_adjustment,stock into v_variant from public.product_variants
      where id=v_variant_id and product_id=v_product_id for update;
      if not found then raise exception 'Variação inválida para %',v_product.name; end if;
      if v_variant.stock < v_quantity then raise exception 'Estoque insuficiente para a variação de %',v_product.name; end if;
      v_unit_price := v_unit_price + v_variant.price_adjustment;
      v_variant_label := v_variant.name || ': ' || v_variant.value;
      update public.product_variants set stock=stock-v_quantity where id=v_variant_id;
    end if;
    if v_unit_price < 0 then raise exception 'Preço inválido'; end if;
    update public.products set stock=stock-v_quantity where id=v_product_id;
    insert into public.order_items (order_id,product_id,product_variant_id,product_name,product_sku,product_material,variant,quantity,unit_price)
    values (v_order_id,v_product_id,v_variant_id,v_product.name,v_product.sku,v_product.material,v_variant_label,v_quantity,v_unit_price);
    v_subtotal := v_subtotal+(v_unit_price*v_quantity);
  end loop;
  v_total := v_subtotal+v_shipping;
  update public.orders set subtotal=v_subtotal,total=v_total where id=v_order_id;
  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'subtotal',v_subtotal,'shipping',v_shipping,'total',v_total,'items',(
    select jsonb_agg(jsonb_build_object('product_name',oi.product_name,'product_sku',oi.product_sku,'product_material',oi.product_material,'variant',oi.variant,'quantity',oi.quantity,'unit_price',oi.unit_price,'total',oi.total) order by oi.id)
    from public.order_items oi where oi.order_id=v_order_id
  ));
end;
$$;

revoke all on function public.create_guest_order(jsonb,jsonb,text) from public;
grant execute on function public.create_guest_order(jsonb,jsonb,text) to anon,authenticated;

commit;
