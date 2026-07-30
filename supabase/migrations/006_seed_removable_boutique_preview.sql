begin;

-- Conteúdo temporário para validar a composição da boutique.
-- Para remover tudo depois: delete from public.products where slug like 'teste-boutique-%';

insert into public.categories (id, name, slug, active)
values
  ('10000000-0000-4000-8000-000000000001', 'Brincos', 'brincos', true),
  ('10000000-0000-4000-8000-000000000002', 'Pulseiras', 'pulseiras', true),
  ('10000000-0000-4000-8000-000000000003', 'Anéis', 'aneis', true)
on conflict (slug) do update set active = true;

insert into public.products (
  id, name, slug, description, material, dimensions, category_id,
  price, promotional_price, stock, active, featured
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '[TESTE] Brinco Gota Solar',
    'teste-boutique-brinco-gota-solar',
    'Produto temporário criado para validar a exposição da boutique. Pode ser removido pelo painel.',
    'Metal dourado — demonstração',
    'Aproximadamente 3 cm — demonstração',
    (select id from public.categories where slug = 'brincos'),
    129.90, 109.90, 8, true, true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '[TESTE] Pulseira Luz',
    'teste-boutique-pulseira-luz',
    'Produto temporário criado para validar a exposição da boutique. Pode ser removido pelo painel.',
    'Metal dourado — demonstração',
    'Ajustável — demonstração',
    (select id from public.categories where slug = 'pulseiras'),
    99.90, null, 12, true, true
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '[TESTE] Anel Onda',
    'teste-boutique-anel-onda',
    'Produto temporário criado para validar a exposição da boutique. Pode ser removido pelo painel.',
    'Metal dourado — demonstração',
    'Aro 17 — demonstração',
    (select id from public.categories where slug = 'aneis'),
    89.90, 79.90, 6, true, true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  material = excluded.material,
  dimensions = excluded.dimensions,
  category_id = excluded.category_id,
  price = excluded.price,
  promotional_price = excluded.promotional_price,
  stock = excluded.stock,
  active = true,
  featured = true;

insert into public.product_images (id, product_id, image_url, alt_text, position)
values
  (
    '30000000-0000-4000-8000-000000000001',
    (select id from public.products where slug = 'teste-boutique-brinco-gota-solar'),
    'https://certnow.github.io/amoremio/assets/images/teste-brinco-gota.webp',
    'Par de brincos dourados em expositor vertical de boutique',
    0
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    (select id from public.products where slug = 'teste-boutique-pulseira-luz'),
    'https://certnow.github.io/amoremio/assets/images/teste-pulseira-luz.webp',
    'Pulseira dourada em bandeja de veludo marfim',
    0
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    (select id from public.products where slug = 'teste-boutique-anel-onda'),
    'https://certnow.github.io/amoremio/assets/images/teste-anel-onda.webp',
    'Anel dourado ondulado em suporte de boutique',
    0
  )
on conflict (id) do update set
  product_id = excluded.product_id,
  image_url = excluded.image_url,
  alt_text = excluded.alt_text,
  position = excluded.position;

commit;
