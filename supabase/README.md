# Configuração do Supabase

Projeto vinculado: `twasjpafmgiaevfoapzc`.

As migrações `001` a `004` foram aplicadas ao projeto remoto em 29 de julho de 2026 e registradas no histórico de migrações do Supabase.

## Ordem das migrações

1. `001_schema.sql`
2. `002_rls_policies.sql`
3. `003_storage.sql`
4. `004_create_order_function.sql`

Não reaplique manualmente arquivos já registrados no histórico remoto. Mudanças futuras devem ser criadas como novas migrações. Não use a chave `service_role` no navegador, no repositório ou em arquivos do frontend.

## Primeiro administrador

1. Em Authentication > Users, crie o usuário `annitacaetano.sr@gmail.com` e defina uma senha forte diretamente no Supabase.
2. Copie o UUID do usuário.
3. No SQL Editor, execute substituindo o UUID:

```sql
insert into public.profiles (id, name, phone, role)
values ('UUID_DO_USUARIO', 'Annita Caetano', null, 'admin');
```

Não coloque senha no SQL nem no GitHub.

## Verificações rápidas

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'categories', 'products', 'product_images', 'product_variants',
    'profiles', 'customers', 'orders', 'order_items',
    'store_settings', 'display_spots'
  )
order by tablename;
```

Todos os resultados devem mostrar `rowsecurity = true`.

```sql
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

O acesso anônimo deve estar limitado à leitura do catálogo ativo, configurações públicas, exposições ativas e imagens, além da execução da função transacional `create_guest_order`.
