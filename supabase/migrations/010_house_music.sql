begin;

alter table public.store_settings
  add column if not exists music_enabled boolean not null default true,
  add column if not exists music_spotify_url text,
  add column if not exists music_title text not null default 'Vozes da Casa Amoremio',
  add column if not exists music_description text not null default 'Uma seleção de vozes femininas que atravessam soul, jazz e música brasileira. Canções para acompanhar momentos de beleza, calma, força e delicadeza dentro da Casa Amoremio.',
  add column if not exists music_cover_url text,
  add column if not exists music_bar_text text not null default '♫ Vozes da Casa',
  add column if not exists music_button_text text not null default 'Abrir no Spotify',
  add column if not exists music_position text not null default 'left' check (music_position in ('left', 'right')),
  add column if not exists music_scope text not null default 'all' check (music_scope in ('home', 'all')),
  add column if not exists music_background_color text not null default '#f3eadc',
  add column if not exists music_opacity numeric(3,2) not null default .92 check (music_opacity between .45 and 1),
  add column if not exists music_show_cover boolean not null default true,
  add column if not exists music_initial_state text not null default 'minimized' check (music_initial_state in ('open', 'minimized'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-assets', 'store-assets', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy store_assets_public_read on storage.objects for select to anon,authenticated
using (bucket_id='store-assets');
create policy store_assets_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='store-assets' and public.is_admin());
create policy store_assets_admin_update on storage.objects for update to authenticated
using (bucket_id='store-assets' and public.is_admin()) with check (bucket_id='store-assets' and public.is_admin());
create policy store_assets_admin_delete on storage.objects for delete to authenticated
using (bucket_id='store-assets' and public.is_admin());

commit;
