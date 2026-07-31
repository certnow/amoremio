begin;

alter table public.store_settings
  add column if not exists home_collections_image_url text,
  add column if not exists home_collections_mobile_image_url text,
  add column if not exists home_collections_position text not null default 'center center',
  add column if not exists home_collections_mobile_position text not null default 'center center',
  add column if not exists home_featured_image_url text,
  add column if not exists home_featured_mobile_image_url text,
  add column if not exists home_featured_position text not null default 'center center',
  add column if not exists home_featured_mobile_position text not null default 'center center',
  add column if not exists home_breath_image_url text,
  add column if not exists home_breath_mobile_image_url text,
  add column if not exists home_breath_position text not null default 'center 60%',
  add column if not exists home_breath_mobile_position text not null default '43% center',
  add column if not exists home_search_image_url text,
  add column if not exists home_search_mobile_image_url text,
  add column if not exists home_search_position text not null default 'center center',
  add column if not exists home_search_mobile_position text not null default 'center center',
  add column if not exists home_editorial_image_url text,
  add column if not exists home_editorial_mobile_image_url text,
  add column if not exists home_editorial_position text not null default 'center center',
  add column if not exists home_editorial_mobile_position text not null default 'center center';

commit;
