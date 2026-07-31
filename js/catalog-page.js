import { loadCategories, loadProductColors, loadProducts, productCard } from "./products.js?v=20260731-1";
import { debounce, escapeHtml } from "./utils.js";
import { initStoreShell } from "./store-shell.js?v=20260730-5";
import { MATERIAL_OPTIONS } from "./product-commercial.js?v=20260730-1";

initStoreShell();

const grid = document.querySelector("[data-product-grid]");
const status = document.querySelector("[data-catalog-status]");
const search = document.querySelector("[data-search]");
const category = document.querySelector("[data-category-filter]");
const material = document.querySelector("[data-material-filter]");
const color = document.querySelector("[data-color-filter]");
const price = document.querySelector("[data-price-filter]");

async function render() {
  status.textContent = "Carregando produtos…";
  grid.innerHTML = "";
  try {
    const sale = category.value === "__saldos";
    const products = await loadProducts({
      search: search.value.trim(),
      category: sale ? "" : category.value,
      material: material.value,
      color: color.value,
      priceRange: price.value,
      sale,
    });
    status.textContent = products.length
      ? `${products.length} produto${products.length === 1 ? "" : "s"}`
      : "Nenhum produto encontrado.";
    grid.innerHTML = products.map(productCard).join("");
  } catch (error) {
    status.textContent = "Não foi possível carregar o catálogo. Tente novamente.";
    console.error(error);
  }
}

try {
  const [categories, colors] = await Promise.all([
    loadCategories(),
    loadProductColors(),
  ]);
  category.insertAdjacentHTML(
    "beforeend",
    categories
      .map(
        (item) =>
          `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`,
      )
      .join(""),
  );
  material.insertAdjacentHTML(
    "beforeend",
    MATERIAL_OPTIONS.map(
      (item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`,
    ).join(""),
  );

  color.insertAdjacentHTML(
    "beforeend",
    colors
      .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
      .join(""),
  );

  const params = new URLSearchParams(location.search);
  if (params.get("saldos") === "1") category.value = "__saldos";
  else if (params.get("categoria")) category.value = params.get("categoria");
  search.value = params.get("busca") || "";
  material.value = params.get("material") || "";
  color.value = params.get("cor") || "";
  price.value = params.get("preco") || "";
} catch (error) {
  console.error(error);
}

search.addEventListener("input", debounce(render));
[category, material, color, price].forEach((field) =>
  field.addEventListener("change", render),
);
render();
