import { supabase } from "../js/supabase-client.js";
import { publicAssetUrl } from "../js/home-backgrounds.js";

const form = document.querySelector("[data-home-images-form]");
if (form) {
  const keys = ["collections", "featured", "breath", "search", "editorial"];
  const message = document.querySelector("[data-global-message]");
  const say = (text) => { message.textContent = text; };
  const render = (key, url) => {
    const root = form.querySelector(`[data-home-preview="${key}"]`);
    root.innerHTML = url ? `<img src="${url}" alt="Prévia do fundo">` : "<span>Imagem padrão da seção</span>";
  };
  const upload = async (key, kind, file) => {
    if (!file) return form.elements[`home_${key}_${kind === "mobile" ? "mobile_" : ""}image_url`].value || null;
    if (!/image\/(jpeg|png|webp)/.test(file.type)) throw new Error("Use imagens JPG, PNG ou WebP.");
    const safe = file.name.normalize("NFD").replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
    const path = `home/${key}/${kind}-${crypto.randomUUID()}-${safe}`;
    const { error } = await supabase.storage.from("store-assets").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return supabase.storage.from("store-assets").getPublicUrl(path).data.publicUrl;
  };
  async function load() {
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", true).single();
    if (error) return say(error.message);
    keys.forEach((key) => {
      ["image_url", "mobile_image_url", "position", "mobile_position"].forEach((suffix) => {
        const field = form.elements[`home_${key}_${suffix}`];
        if (field) field.value = data[`home_${key}_${suffix}`] || field.value || "";
      });
      render(key, publicAssetUrl(data[`home_${key}_image_url`]));
    });
  }
  keys.forEach((key) => {
    form.elements[`home_${key}_file`].addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file); render(key, url);
    });
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; say("Enviando imagens da home…");
    try {
      const payload = {};
      for (const key of keys) {
        payload[`home_${key}_image_url`] = await upload(key, "desktop", form.elements[`home_${key}_file`].files[0]);
        payload[`home_${key}_mobile_image_url`] = await upload(key, "mobile", form.elements[`home_${key}_mobile_file`].files[0]);
        payload[`home_${key}_position`] = form.elements[`home_${key}_position`].value;
        payload[`home_${key}_mobile_position`] = form.elements[`home_${key}_mobile_position`].value;
      }
      const { error } = await supabase.from("store_settings").update(payload).eq("id", true);
      if (error) throw error;
      say("Imagens da home salvas."); await load();
    } catch (error) { say(`Não foi possível salvar: ${error.message}`); }
    finally { button.disabled = false; }
  });
  await load();
}
