import { supabase } from "./supabase-client.js";
import { escapeHtml } from "./utils.js";

const STATE_KEY = "amoremio:house-music-state";
const HOME_FILE = /(?:^|\/)index\.html$|\/$/;

function spotifyEmbed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "open.spotify.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const offset = parts[0]?.startsWith("intl-") ? 1 : 0;
    const type = parts[offset], id = parts[offset + 1];
    if (!id || !["playlist", "album", "artist", "show", "episode", "track"].includes(type)) return null;
    return `https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator&theme=0`;
  } catch { return null; }
}

function addStylesheet() {
  if (document.querySelector('link[data-house-music-style]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = "css/music.css?v=20260730-1"; link.dataset.houseMusicStyle = "";
  document.head.append(link);
}

export async function initHouseMusic() {
  if (document.querySelector("[data-house-music]")) return;
  const { data: settings, error } = await supabase.from("store_settings").select("music_enabled,music_spotify_url,music_title,music_description,music_cover_url,music_bar_text,music_button_text,music_position,music_scope,music_background_color,music_opacity,music_show_cover,music_initial_state").eq("id", true).maybeSingle();
  if (error || !settings?.music_enabled) return;
  if (settings.music_scope === "home" && !HOME_FILE.test(location.pathname)) return;
  addStylesheet();
  const saved = localStorage.getItem(STATE_KEY);
  const state = ["open", "minimized", "closed"].includes(saved) ? saved : settings.music_initial_state;
  if (state === "closed") return;
  const validEmbed = spotifyEmbed(settings.music_spotify_url);
  const root = document.createElement("aside");
  root.className = "house-music"; root.dataset.houseMusic = ""; root.dataset.position = settings.music_position || "left";
  root.style.setProperty("--music-bg", settings.music_background_color || "#f3eadc");
  root.style.setProperty("--music-opacity", String(settings.music_opacity ?? .92));
  const cover = settings.music_show_cover ? (settings.music_cover_url ? `<img class="house-music__cover" src="${escapeHtml(settings.music_cover_url)}" alt="Capa de ${escapeHtml(settings.music_title)}">` : '<span class="house-music__cover-placeholder" aria-label="Capa ainda não cadastrada">AM</span>') : "";
  root.innerHTML = `<button class="house-music__pill" type="button" data-music-toggle aria-expanded="${state === "open"}"><span aria-hidden="true">♫</span><span>${escapeHtml((settings.music_bar_text || "♫ Vozes da Casa").replace(/^♫\s*/, ""))}</span></button>
    <section class="house-music__panel" data-music-panel ${state === "open" ? "" : "hidden"} aria-label="Música da Casa">
      <div class="house-music__tools"><button type="button" data-music-minimize aria-label="Minimizar">−</button><button type="button" data-music-close aria-label="Fechar nesta sessão">×</button></div>
      <div class="house-music__intro${settings.music_show_cover ? "" : " no-cover"}">${cover}<div><h2>${escapeHtml(settings.music_title || "Vozes da Casa Amoremio")}</h2><p>${escapeHtml(settings.music_description || "")}</p></div></div>
      <div class="house-music__embed" data-music-embed>${validEmbed ? "" : '<div class="house-music__preparing">Playlist em preparação</div>'}</div>
      <a class="house-music__spotify" data-music-spotify href="${validEmbed ? escapeHtml(settings.music_spotify_url) : "#"}" target="_blank" rel="noopener" ${validEmbed ? "" : "hidden"}>${escapeHtml(settings.music_button_text || "Abrir no Spotify")}</a>
    </section>`;
  document.body.append(root);
  const panel = root.querySelector("[data-music-panel]"), toggle = root.querySelector("[data-music-toggle]"), embed = root.querySelector("[data-music-embed]");
  let loaded = false;
  const open = () => { panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); localStorage.setItem(STATE_KEY, "open"); if (validEmbed && !loaded) { embed.innerHTML = `<iframe src="${validEmbed}" title="Player oficial do Spotify: ${escapeHtml(settings.music_title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`; loaded = true; } };
  const minimize = () => { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); localStorage.setItem(STATE_KEY, "minimized"); toggle.focus(); };
  toggle.addEventListener("click", () => panel.hidden ? open() : minimize());
  root.querySelector("[data-music-minimize]").addEventListener("click", minimize);
  root.querySelector("[data-music-close]").addEventListener("click", () => { localStorage.setItem(STATE_KEY, "closed"); root.remove(); });
  if (state === "open") open();
}
