import { supabase } from "./supabase-client.js";

const FALLBACKS = Object.freeze({
  collections: "assets/images/fachada-amoremio-clean-v2.webp",
  featured: "assets/images/vitrine-escolhas-da-casa.webp",
  breath: "assets/images/casa-amoremio-clean-v2.webp",
  search: "assets/images/fachada-amoremio-clean-v2.webp",
  editorial: "assets/images/casa-amoremio-clean-v2.webp",
});

const POSITION = /^(?:left|center|right|\d{1,3}%)(?:\s+(?:top|center|bottom|\d{1,3}%))?$/i;
const safePosition = (value, fallback = "center center") =>
  POSITION.test(String(value || "").trim()) ? String(value).trim() : fallback;

export function publicAssetUrl(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^https?:\/\//i.test(source)) return source;
  if (source.startsWith("assets/")) return new URL(source, document.baseURI).href;
  const path = source.replace(/^\/+/, "").replace(/^store-assets\//, "");
  return supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl;
}

function applyBackground(section, key, settings) {
  const desktop = publicAssetUrl(settings[`home_${key}_image_url`] || FALLBACKS[key]);
  const mobile = publicAssetUrl(settings[`home_${key}_mobile_image_url`] || desktop);
  section.style.setProperty("--section-background", `url("${desktop.replace(/["\\]/g, "\\$&")}")`);
  section.style.setProperty("--section-mobile-background", `url("${mobile.replace(/["\\]/g, "\\$&")}")`);
  section.style.setProperty("--section-position", safePosition(settings[`home_${key}_position`]));
  section.style.setProperty("--section-mobile-position", safePosition(settings[`home_${key}_mobile_position`]));
  section.dataset.backgroundSource = settings[`home_${key}_image_url`] ? "supabase" : "fallback";
}

export async function loadHomeBackgrounds() {
  const sections = [...document.querySelectorAll("[data-home-background]")];
  const { data, error } = await supabase.from("store_settings").select("*").eq("id", true).maybeSingle();
  const settings = error ? {} : data || {};
  sections.forEach((section) => applyBackground(section, section.dataset.homeBackground, settings));
  if (error) console.warn("Fundos da home carregados pelos fallbacks:", error.message);
  return { settings, usedFallback: Boolean(error) };
}

if (document.querySelector("[data-home-background]")) await loadHomeBackgrounds();
