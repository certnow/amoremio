begin;

alter table public.customers
  add column if not exists notes text;

create table if not exists public.data_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  operation text not null check (operation in ('export', 'import')),
  resource text not null check (resource in ('customers', 'products', 'orders', 'categories', 'stock', 'backup')),
  record_count integer not null default 0 check (record_count >= 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.data_operations enable row level security;
revoke all on table public.data_operations from anon, authenticated;
grant select, insert on table public.data_operations to authenticated;

create policy data_operations_admin_read
on public.data_operations for select to authenticated
using (public.is_admin());

create policy data_operations_admin_insert
on public.data_operations for insert to authenticated
with check (public.is_admin() and user_id = (select auth.uid()));

create index if not exists data_operations_created_idx
  on public.data_operations (created_at desc);

commit;
