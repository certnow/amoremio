import { loadCategories, loadProducts, productCard } from "./products.js?v=20260730-4";
import { debounce, escapeHtml } from "./utils.js";
import { initStoreShell } from "./store-shell.js?v=20260730-5";
import { MATERIAL_OPTIONS } from "./product-commercial.js?v=20260730-1";

initStoreShell();
const grid = document.querySelector("[data-product-grid]"); const status = document.querySelector("[data-catalog-status]");
const search = document.querySelector("[data-search]"); const select = document.querySelector("[data-category-filter]"),material=document.querySelector("[data-material-filter]");
async function render() {
  status.textContent = "Carregando produtos…"; grid.innerHTML = "";
  try { const sale=select.value==="__saldos"; const products = await loadProducts({ search: search.value.trim(), category:sale?"":select.value, material:material.value, sale });
    status.textContent = products.length ? `${products.length} produto${products.length === 1 ? "" : "s"}` : "Nenhum produto encontrado.";
    grid.innerHTML = products.map(productCard).join("");
  } catch (error) { status.textContent = "Não foi possível carregar o catálogo. Tente novamente."; console.error(error); }
}
try { const categories = await loadCategories(); select.insertAdjacentHTML("beforeend", categories.map((item) => `<option value="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</option>`).join(""));material.insertAdjacentHTML("beforeend",MATERIAL_OPTIONS.map((item)=>`<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join(""));
  const params = new URLSearchParams(location.search); const initial = params.get("categoria"); if (params.get("saldos")==="1")select.value="__saldos";else if (initial) select.value = initial;
  const initialSearch = params.get("busca"); if (initialSearch) search.value = initialSearch;
} catch (error) { console.error(error); }
search.addEventListener("input", debounce(render)); select.addEventListener("change", render);material.addEventListener("change",render); render();
