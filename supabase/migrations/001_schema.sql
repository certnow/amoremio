begin;

create extension if not exists pgcrypto;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  material text,
  dimensions text,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  promotional_price numeric(12,2) check (
    promotional_price is null or (promotional_price >= 0 and promotional_price < price)
  ),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  position integer not null default 0 check (position >= 0),
  unique (product_id, position)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  value text not null check (char_length(trim(value)) between 1 and 120),
  price_adjustment numeric(12,2) not null default 0,
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  unique (product_id, name, value)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null check (role = 'admin'),
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  normalized_phone text not null unique,
  email text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping numeric(12,2) not null default 0 check (shipping >= 0),
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled')
  ),
  notes text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant text,
  quantity integer not null check (quantity between 1 and 100),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) generated always as (quantity * unit_price) stored
);

create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Amoremio',
  whatsapp_number text not null default '5561992278585',
  instagram_url text,
  contact_email text,
  address text,
  default_shipping numeric(12,2) not null default 0 check (default_shipping >= 0),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id, store_name, whatsapp_number)
values (true, 'Amoremio', '5561992278585')
on conflict (id) do nothing;

create table public.display_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  section text not null,
  product_id uuid references public.products(id) on delete set null,
  display_type text not null check (
    display_type in ('earring_shelf', 'bracelet_stand', 'ring_tray', 'hairclip_niche', 'collection_scene')
  ),
  position integer not null default 0 check (position >= 0),
  scale numeric(5,2) not null default 1 check (scale between 0.25 and 3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (section, position)
);

create index categories_active_idx on public.categories (active, name);
create index products_catalog_idx on public.products (active, category_id, featured, created_at desc);
create index product_images_product_idx on public.product_images (product_id, position);
create index product_variants_product_idx on public.product_variants (product_id);
create index orders_created_idx on public.orders (created_at desc);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index order_items_order_idx on public.order_items (order_id);
create index display_spots_section_idx on public.display_spots (active, section, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_updated_at();

commit;
