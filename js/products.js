import { supabase } from "./supabase-client.js";
import { escapeHtml, firstImage, money } from "./utils.js";
import { discountPercent, isSaleProduct, materialLabel, publicProductTitle } from "./product-commercial.js?v=20260730-1";

const PRODUCT_SELECT = "*, categories(id,name,slug), product_images(id,image_url,storage_path,alt_text,position,is_primary), product_variants(id,name,value,price_adjustment,stock,image_url,image_id)";

export async function resolveProductImages(products) {
  const list = Array.isArray(products) ? products : [products];
  const paths = [...new Set(list.flatMap((product) => (product?.product_images || []).map((image) => image.storage_path).filter(Boolean)))];
  if (!paths.length) return products;
  const { data, error } = await supabase.storage.from("product-images").createSignedUrls(paths, 3600);
  if (error) throw error;
  const signedByPath = new Map((data || []).flatMap((item, index) => item.signedUrl ? [[item.path || paths[index], item.signedUrl]] : []));
  list.forEach((product) => {
    (product?.product_images || []).forEach((image) => {
      if (image.storage_path && signedByPath.has(image.storage_path)) image.image_url = signedByPath.get(image.storage_path);
    });
    (product?.product_variants || []).forEach((variant) => {
      const linked = (product.product_images || []).find((image) => image.id === variant.image_id);
      if (linked?.image_url) variant.image_url = linked.image_url;
    });
  });
  return products;
}

export async function loadCategories() {
  const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("name");
  if (error) throw error; return data || [];
}
export async function loadProducts({ category, material, sale, search, featured, limit } = {}) {
  let query = supabase.from("products").select(PRODUCT_SELECT).eq("active", true).order("created_at", { ascending: false });
  if (search) { const term=search.replace(/[%(),]/g, ""); query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%,material.ilike.%${term}%,material_details.ilike.%${term}%`); }
  if (featured) query = query.eq("featured", true);
  if (limit) query = query.limit(limit);
  const { data, error } = await query; if (error) throw error;
  await resolveProductImages(data || []);
  return (data || []).filter((product) => (!category || product.categories?.slug === category) && (!material || product.material === material) && (!sale || isSaleProduct(product)));
}
export async function loadProduct(identifier) {
  const field = /^[0-9a-f-]{36}$/i.test(identifier) ? "id" : "slug";
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq(field, identifier).eq("active", true).maybeSingle();
  if (error) throw error; if (data) await resolveProductImages(data); return data;
}
export function productCard(product) {
  const image = firstImage(product), price = product.promotional_price ?? product.price, title=publicProductTitle(product), discount=discountPercent(product),sale=isSaleProduct(product);
  return `<article class="product-card">
    <a class="product-card__image" href="produto.html?produto=${encodeURIComponent(product.slug || product.id)}">
      ${image ? `<img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || title)}" loading="lazy">` : `<span class="product-card__placeholder" aria-hidden="true">AM</span>`}
      ${product.stock <= 0 ? '<span class="product-card__badge">Esgotado</span>' : sale ? `<span class="product-card__badge product-card__badge--sale">Saldo · ${discount}%</span>` : product.featured ? '<span class="product-card__badge">Destaque</span>' : ""}
    </a>
    <div class="product-card__body"><span>${escapeHtml(product.categories?.name || "Amoremio")}</span>
      <h3><a href="produto.html?produto=${encodeURIComponent(product.slug || product.id)}">${escapeHtml(title)}</a></h3>
      ${product.material?`<small class="product-card__material">${escapeHtml(materialLabel(product))}</small>`:""}
      ${product.promotional_price ? `<p><s>${money(product.price)}</s> <strong>${money(price)}</strong></p>` : `<p><strong>${money(price)}</strong></p>`}
    </div></article>`;
}
