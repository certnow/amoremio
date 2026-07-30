import { supabase } from "./supabase-client.js";
import { escapeHtml, firstImage, money } from "./utils.js";

const PRODUCT_SELECT = "*, categories(id,name,slug), product_images(id,image_url,alt_text,position), product_variants(id,name,value,price_adjustment,stock,image_url)";

export async function loadCategories() {
  const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("name");
  if (error) throw error; return data || [];
}
export async function loadProducts({ category, search, featured, limit } = {}) {
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("active", true).order("created_at", { ascending: false });
  if (search) query = query.or(`name.ilike.%${search.replace(/[%(),]/g, "") }%,description.ilike.%${search.replace(/[%(),]/g, "")}%`);
  if (featured) query = query.eq("featured", true);
  if (limit) query = query.limit(limit);
  const { data, error } = await query; if (error) throw error;
  return category ? (data || []).filter((product) => product.categories?.slug === category) : (data || []);
}
export async function loadProduct(identifier) {
  const field = /^[0-9a-f-]{36}$/i.test(identifier) ? "id" : "slug";
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq(field, identifier).eq("active", true).maybeSingle();
  if (error) throw error; return data;
}
export function productCard(product) {
  const image = firstImage(product); const price = product.promotional_price ?? product.price;
  return `<article class="product-card">
    <a class="product-card__image" href="produto.html?produto=${encodeURIComponent(product.slug || product.id)}">
      ${image ? `<img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || product.name)}" loading="lazy">` : `<span class="product-card__placeholder" aria-hidden="true">AM</span>`}
      ${product.stock <= 0 ? '<span class="product-card__badge">Esgotado</span>' : product.featured ? '<span class="product-card__badge">Destaque</span>' : ""}
    </a>
    <div class="product-card__body"><span>${escapeHtml(product.categories?.name || "Amoremio")}</span>
      <h3><a href="produto.html?produto=${encodeURIComponent(product.slug || product.id)}">${escapeHtml(product.name)}</a></h3>
      ${product.promotional_price ? `<p><s>${money(product.price)}</s> <strong>${money(price)}</strong></p>` : `<p><strong>${money(price)}</strong></p>`}
    </div></article>`;
}
