import { addToCart } from "./cart.js";
import { loadCategories, loadProducts } from "./products.js?v=20260731-1";
import { escapeHtml, firstImage, money } from "./utils.js";
import { initStoreShell } from "./store-shell.js?v=20260730-5";
import {
  discountPercent,
  isSaleProduct,
  materialLabel,
  MATERIAL_OPTIONS,
  publicProductTitle,
} from "./product-commercial.js?v=20260730-1";

initStoreShell();

const categoryRoot = document.querySelector("[data-home-categories]");
const productRoot = document.querySelector("[data-home-products]");
const editorialRoot = document.querySelector("[data-home-editorial]");
const categoryFilter = document.querySelector("[data-home-category-filter]");
const materialFilter = document.querySelector("[data-home-material-filter]");
const colorFilter = document.querySelector("[data-home-color-filter]");
const status = document.querySelector("[data-home-status]");

let displayedProducts = [];

const fold = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const preferredCollections = [
  { label: "Anéis", aliases: ["aneis", "anel"] },
  { label: "Brincos", aliases: ["brincos", "brinco"] },
  { label: "Pulseiras", aliases: ["pulseiras", "pulseira"] },
  { label: "Cabelo", aliases: ["cabelo", "presilhas", "presilha"] },
  { label: "Beleza", aliases: ["beleza", "cuidados", "autocuidado"] },
  { label: "Presentes", aliases: ["presentes", "presente"] },
];

function findCategory(collection, categories) {
  return categories.find((category) => {
    const values = [fold(category.name), fold(category.slug)];
    return collection.aliases.some((alias) =>
      values.some((value) => value.includes(alias)),
    );
  });
}

function findCollectionImage(collection, category, products) {
  if (category?.image_url) return category.image_url;
  const product = products.find((item) => {
    const categoryValues = [
      fold(item.categories?.name),
      fold(item.categories?.slug),
    ];
    return collection.aliases.some((alias) =>
      categoryValues.some((value) => value.includes(alias)),
    );
  });
  return product ? firstImage(product)?.image_url || "" : "";
}

function categoryCard(collection, categories, products) {
  const category = findCategory(collection, categories);
  const image = findCollectionImage(collection, category, products);
  const href = category
    ? `produtos.html?categoria=${encodeURIComponent(category.slug)}`
    : `produtos.html?busca=${encodeURIComponent(collection.label)}`;

  return `<a class="home-category-arch" href="${href}">
    <span class="home-category-arch__visual">
      ${
        image
          ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">`
          : `<span class="home-category-arch__placeholder" aria-hidden="true">${escapeHtml(collection.label.slice(0, 1))}</span>`
      }
    </span>
    <strong>${escapeHtml(collection.label)}</strong>
  </a>`;
}

function featuredProduct(product) {
  const image = firstImage(product);
  const price = product.promotional_price ?? product.price;
  const detailUrl = `produto.html?produto=${encodeURIComponent(product.slug || product.id)}`;
  const hasVariants = (product.product_variants || []).length > 0;
  const title = publicProductTitle(product);
  const sale = isSaleProduct(product);
  const discount = discountPercent(product);

  return `<article class="home-feature-card">
    <a class="home-feature-card__image" href="${detailUrl}" aria-label="Ver ${escapeHtml(title)}">
      ${
        image
          ? `<img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || title)}" loading="lazy">`
          : '<span class="home-category-arch__placeholder" aria-hidden="true">AM</span>'
      }
      <span class="home-feature-card__heart" aria-hidden="true">♡</span>
      ${sale ? `<span class="product-card__badge product-card__badge--sale">Saldo · ${discount}%</span>` : ""}
    </a>
    <div class="home-feature-card__body">
      <span>${escapeHtml(product.categories?.name || "Amoremio")}</span>
      <h3><a href="${detailUrl}">${escapeHtml(title)}</a></h3>
      <div class="home-feature-card__price">${
        product.promotional_price ? `<s>${money(product.price)}</s>` : ""
      }<strong>${money(price)}</strong></div>
      ${
        hasVariants
          ? `<a class="home-feature-card__action" href="${detailUrl}">Escolher opções</a>`
          : `<button class="home-feature-card__action" type="button" data-add-product="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>${product.stock > 0 ? "Adicionar ao carrinho" : "Indisponível"}</button>`
      }
    </div>
  </article>`;
}

function editorialCard(product) {
  const image = firstImage(product);
  if (!image) return "";
  const title = publicProductTitle(product);
  const detailUrl = `produto.html?produto=${encodeURIComponent(product.slug || product.id)}`;
  return `<a class="home-memory-card" href="${detailUrl}" aria-label="Ver ${escapeHtml(title)}">
    <img src="${escapeHtml(image.image_url)}" alt="${escapeHtml(image.alt_text || title)}" loading="lazy">
    <span>${escapeHtml(title)}</span>
  </a>`;
}

function featuredSelection(products) {
  const featured = products.filter((product) => product.featured);
  const remaining = products.filter((product) => !featured.includes(product));
  return [...featured, ...remaining].slice(0, 4);
}

function productColors(products) {
  const knownColor = /(dourad|pratead|azul|verde|rosa|preto|branco|bege|marrom|vermelh|lilas|roxo)/i;
  return [
    ...new Set(
      products.flatMap((product) =>
        (product.product_variants || [])
          .filter(
            (variant) =>
              /(cor|color|acabamento)/i.test(variant.name || "") ||
              knownColor.test(variant.value || ""),
          )
          .map((variant) => String(variant.value || "").trim())
          .filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

try {
  const [categories, products] = await Promise.all([
    loadCategories(),
    loadProducts({ limit: 24 }),
  ]);

  categoryRoot.innerHTML = preferredCollections
    .map((collection) => categoryCard(collection, categories, products))
    .join("");

  displayedProducts = featuredSelection(products);
  productRoot.innerHTML = displayedProducts.length
    ? displayedProducts.map(featuredProduct).join("")
    : '<p class="boutique-empty">As peças em destaque aparecerão aqui automaticamente depois do cadastro.</p>';

  const editorialProducts = products
    .filter((product) => firstImage(product))
    .slice(0, 3);
  editorialRoot.innerHTML = editorialProducts.length
    ? editorialProducts.map(editorialCard).join("")
    : '<p class="home-memory-empty">As imagens editoriais serão formadas com as fotografias reais dos produtos.</p>';

  categoryFilter.insertAdjacentHTML(
    "beforeend",
    categories
      .map(
        (category) =>
          `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</option>`,
      )
      .join(""),
  );
  materialFilter.insertAdjacentHTML(
    "beforeend",
    MATERIAL_OPTIONS.map(
      (material) =>
        `<option value="${escapeHtml(material)}">${escapeHtml(material)}</option>`,
    ).join(""),
  );
  colorFilter.insertAdjacentHTML(
    "beforeend",
    productColors(products)
      .map((color) => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`)
      .join(""),
  );

  status.textContent = "";
} catch (error) {
  console.error(error);
  status.textContent =
    "Não foi possível carregar as escolhas da Casa agora. Tente novamente em instantes.";
}

productRoot.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-product]");
  if (!button) return;
  const product = displayedProducts.find(
    (item) => item.id === button.dataset.addProduct,
  );
  if (!product || product.stock <= 0) return;
  const image = firstImage(product);
  addToCart({
    productId: product.id,
    slug: product.slug,
    name: publicProductTitle(product),
    sku: product.sku,
    material: materialLabel(product),
    imageUrl: image?.image_url || "",
    variantId: null,
    variantLabel: "",
    unitPrice: Number(product.promotional_price ?? product.price),
    quantity: 1,
    stock: Number(product.stock),
  });
  status.textContent = `${publicProductTitle(product)} foi adicionado ao carrinho.`;
});
