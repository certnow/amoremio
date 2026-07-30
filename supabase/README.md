# Configuração do Supabase

Projeto vinculado: `twasjpafmgiaevfoapzc`.

As migrações `001` a `004` foram aplicadas ao projeto remoto em 29 de julho de 2026 e registradas no histórico de migrações do Supabase. A migração `005` associa o primeiro usuário administrativo criado no Supabase Auth.

## Ordem das migrações

1. `001_schema.sql`
2. `002_rls_policies.sql`
3. `003_storage.sql`
4. `004_create_order_function.sql`
5. `005_bootstrap_admin.sql`
6. `006_seed_removable_boutique_preview.sql` — três produtos temporários para validar a exposição visual
7. `007_product_image_gallery.sql` — galeria múltipla, imagem principal, Storage privado e vínculo de variação
8. `008_fix_product_storage_read.sql` — leitura temporária restrita às imagens de produtos ativos
9. `009_secure_product_image_access.sql` — verificação segura entre arquivo, imagem cadastrada e produto ativo
10. `010_house_music.sql` — configurações da Música da Casa e bucket público de capas
11. `011_normalize_spotify_embed_url.sql` — normaliza a playlist salva para a URL oficial de incorporação

A migração 007 preserva as imagens existentes, identifica a primeira como principal,
adiciona ordenação segura e transforma o bucket de produtos em privado. A loja gera
links temporários somente para imagens autorizadas pelas políticas do catálogo.

Não reaplique manualmente arquivos já registrados no histórico remoto. Mudanças futuras devem ser criadas como novas migrações. Não use a chave `service_role` no navegador, no repositório ou em arquivos do frontend.

Os produtos cujo slug começa com `teste-boutique-` são temporários. Para removê-los, use o painel administrativo ou execute `tests/remove_boutique_preview.sql`.

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
