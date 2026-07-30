begin;

update public.store_settings
set music_spotify_url = regexp_replace(music_spotify_url, '\?.*$', '') || '?utm_source=generator'
where music_spotify_url ~ '^https://open\.spotify\.com/embed/playlist/[^?/#]+';

commit;
