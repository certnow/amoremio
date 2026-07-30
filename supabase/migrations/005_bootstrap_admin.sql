begin;

do $$
declare
  v_user_id uuid;
begin
  select id
  into v_user_id
  from auth.users
  where lower(email) = lower('annitacaetano.sr@gmail.com')
  order by created_at desc
  limit 1;

  if v_user_id is null then
    raise exception 'Usuário administrativo não encontrado no Supabase Auth';
  end if;

  insert into public.profiles (id, name, phone, role)
  values (v_user_id, 'Annita Caetano', null, 'admin')
  on conflict (id) do update set
    name = excluded.name,
    role = 'admin';
end;
$$;

commit;
