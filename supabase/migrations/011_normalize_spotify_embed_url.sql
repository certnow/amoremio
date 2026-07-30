begin;

update public.store_settings
set music_spotify_url = regexp_replace(
  music_spotify_url,
  '^https://open\.spotify\.com/(intl-[^/]+/)?(embed/)?playlist/([^?/#]+).*$',
  'https://open.spotify.com/embed/playlist/\3'
)
where music_spotify_url ~ '^https://open\.spotify\.com/(intl-[^/]+/)?(embed/)?playlist/[^?/#]+';

commit;
