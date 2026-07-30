import { addToCart } from "./cart.js";
import { loadCategories, loadProducts } from "./products.js?v=20260730-3";
import { escapeHtml, firstImage, money } from "./utils.js";
import { initStoreShell } from "./store-shell.js?v=20260730-4";

initStoreShell();

const categoryRoot = document.querySelector("[data-home-categories]");
const productRoot = document.querySelector("[data-home-products]");
const status = document.querySelector("[data-home-status]");
let displayedProducts = [];

const displayType = (product, index) => {
  const slug = product.categories?.slug || "";
  if (slug.includes("brinco")) return "earring";
  if (slug.includes("pulseira")) return "bracelet";
  if (slug.includes("anel") || slug.includes("anei")) return "ring";
  if (slug.includes("presilha")) return "niche";
  if (slug.includes("inox")) return "shelf";
  return ["niche", "shelf", "tray"][index % 3];
};

const boutiqueProduct = (product, index) => {
  const image = firstImage(product);
  const price = product.promotional_price ?? product.price;
  const type = displayType(product, index);
  const detailUrl = `produto.html?produto=${encodeURIComponent(product.slug || product.id)}`;
  const hasVariants = (product.product_variants || []).length > 0;
  return `<article class="boutique-product boutique-product--${type}">
    <a class="boutique-product__stage" href="${detailUrl}" aria-label="Ver ${escapeHtml(product.name)}">
      <span class="boutique-product__architecture" aria-hidden="true"></span>
      ${image ? `<img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || product.name)}" loading="lazy">` : '<span class="boutique-product__placeholder" aria-hidden="true">AM</span>'}
    </a>
    <div class="boutique-product__information">
      <span class="boutique-product__category">${escapeHtml(product.categories?.name || "Amoremio")}</span>
      <h3><a href="${detailUrl}">${escapeHtml(product.name)}</a></h3>
      <div class="boutique-product__price">${product.promotional_price ? `<s>${money(product.price)}</s>` : ""}<strong>${money(price)}</strong></div>
      <p class="boutique-product__stock">${product.stock > 0 ? `${product.stock} em estoque` : "Esgotado"}</p>
      ${hasVariants
        ? `<a class="boutique-product__action" href="${detailUrl}">Escolher opções</a>`
        : `<button class="boutique-product__action" type="button" data-add-product="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>${product.stock > 0 ? "Adicionar ao carrinho" : "Indisponível"}</button>`}
    </div>
  </article>`;
};

try {
  const [categories, products] = await Promise.all([
    loadCategories(),
    loadProducts({ featured: true, limit: 8 }),
  ]);

  categoryRoot.innerHTML = categories.length
    ? categories.slice(0, 6).map((category, index) => `<a class="home-category home-category--${index % 3}" href="produtos.html?categoria=${encodeURIComponent(category.slug)}">${category.image_url ? `<img src="${escapeHtml(category.image_url)}" alt="">` : ""}<span>Descobrir</span><strong>${escapeHtml(category.name)}</strong></a>`).join("")
    : '<p class="notice">As categorias aparecerão aqui assim que forem cadastradas no painel.</p>';

  displayedProducts = products;
  productRoot.innerHTML = products.length
    ? products.map(boutiqueProduct).join("")
    : '<p class="boutique-empty">Os produtos em destaque aparecerão aqui automaticamente depois do cadastro.</p>';
  status.textContent = "";
} catch (error) {
  console.error(error);
  status.textContent = "Não foi possível carregar a loja agora. Tente novamente em instantes.";
}

productRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (!button) return;
  const product = displayedProducts.find((item) => item.id === button.dataset.addProduct);
  if (!product || product.stock <= 0) return;
  const image = firstImage(product);
  addToCart({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: image?.image_url || "",
    variantId: null,
    variantLabel: "",
    unitPrice: Number(product.promotional_price ?? product.price),
    quantity: 1,
    stock: Number(product.stock),
  });
  status.textContent = `${product.name} foi adicionado ao carrinho.`;
});
