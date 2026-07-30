begin;

delete from public.products
where slug like 'teste-boutique-%';

delete from public.categories c
where c.slug in ('brincos', 'pulseiras', 'aneis')
  and not exists (
    select 1 from public.products p where p.category_id = c.id
  );

commit;
