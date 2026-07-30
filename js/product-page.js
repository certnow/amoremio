import { addToCart } from "./cart.js";
import { loadProduct } from "./products.js";
import { escapeHtml, money, productPrice } from "./utils.js";
import { initStoreShell } from "./store-shell.js";

initStoreShell();
const root = document.querySelector("[data-product-detail]");
const id = new URLSearchParams(location.search).get("produto");

if (!id) root.innerHTML = '<div class="empty-state"><h1>Produto não informado</h1><a class="button" href="produtos.html">Ver catálogo</a></div>';
else {
  try { const product = await loadProduct(id); if (!product) throw new Error("Produto não encontrado"); render(product); }
  catch (error) { root.innerHTML = `<div class="empty-state"><h1>Produto indisponível</h1><p>${escapeHtml(error.message)}</p><a class="button" href="produtos.html">Ver catálogo</a></div>`; }
}

function galleryMarkup(images, productName) {
  if (!images.length) return '<div class="product-gallery__empty" aria-hidden="true">AM</div>';
  const first = images[0];
  return `<section class="product-gallery" aria-label="Galeria de ${escapeHtml(productName)}">
    <div class="product-gallery__stage" data-gallery-stage tabindex="0">
      <button class="gallery-arrow gallery-arrow--previous" type="button" data-gallery-previous aria-label="Foto anterior">‹</button>
      <button class="product-gallery__zoom" type="button" data-gallery-zoom aria-label="Ampliar imagem"><img data-gallery-main src="${escapeHtml(first.image_url)}" alt="${escapeHtml(first.alt_text || productName)}" fetchpriority="high"></button>
      <button class="gallery-arrow gallery-arrow--next" type="button" data-gallery-next aria-label="Próxima foto">›</button>
      <span class="product-gallery__counter" data-gallery-counter>1 / ${images.length}</span>
    </div>
    <div class="product-gallery__thumbs" role="list" aria-label="Miniaturas">${images.map((image, index) => `<button type="button" role="listitem" class="product-gallery__thumb${index === 0 ? " is-active" : ""}" data-gallery-index="${index}" aria-label="Mostrar foto ${index + 1}"><img src="${escapeHtml(image.image_url)}" alt="" loading="${index < 3 ? "eager" : "lazy"}"></button>`).join("")}</div>
    <dialog class="product-lightbox" data-gallery-dialog aria-label="Imagem ampliada"><button type="button" data-gallery-close aria-label="Fechar visualização">×</button><img data-gallery-lightbox-image src="${escapeHtml(first.image_url)}" alt="${escapeHtml(first.alt_text || productName)}"></dialog>
  </section>`;
}

function initGallery(images) {
  if (!images.length) return { showByReference: () => {} };
  let current = 0;
  const stage = root.querySelector("[data-gallery-stage]");
  const main = root.querySelector("[data-gallery-main]");
  const counter = root.querySelector("[data-gallery-counter]");
  const thumbs = [...root.querySelectorAll("[data-gallery-index]")];
  const dialog = root.querySelector("[data-gallery-dialog]");
  const lightbox = root.querySelector("[data-gallery-lightbox-image]");
  const show = (index) => {
    current = (index + images.length) % images.length;
    const image = images[current];
    main.src = image.image_url; main.alt = image.alt_text || "Imagem do produto";
    lightbox.src = image.image_url; lightbox.alt = main.alt;
    counter.textContent = `${current + 1} / ${images.length}`;
    thumbs.forEach((thumb, thumbIndex) => { thumb.classList.toggle("is-active", thumbIndex === current); thumb.setAttribute("aria-current", thumbIndex === current ? "true" : "false"); });
    thumbs[current]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };
  const showByReference = (reference) => { const index = images.findIndex((image) => image.id === reference || image.image_url === reference); if (index >= 0) show(index); };
  root.querySelector("[data-gallery-previous]").addEventListener("click", () => show(current - 1));
  root.querySelector("[data-gallery-next]").addEventListener("click", () => show(current + 1));
  thumbs.forEach((thumb) => thumb.addEventListener("click", () => show(Number(thumb.dataset.galleryIndex))));
  stage.addEventListener("keydown", (event) => { if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); } if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); } if (event.key === "Enter") dialog.showModal(); });
  let touchStart = 0;
  stage.addEventListener("touchstart", (event) => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (event) => { const distance = event.changedTouches[0].clientX - touchStart; if (Math.abs(distance) > 45) show(current + (distance < 0 ? 1 : -1)); }, { passive: true });
  root.querySelector("[data-gallery-zoom]").addEventListener("click", () => dialog.showModal());
  root.querySelector("[data-gallery-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  show(0);
  return { showByReference };
}

function render(product) {
  document.title = `${product.name} | Amoremio`;
  const images = [...(product.product_images || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position);
  const variants = product.product_variants || [];
  const baseStock = Number(product.stock || 0);
  root.innerHTML = `${galleryMarkup(images, product.name)}
  <div class="product-info"><a class="breadcrumb" href="produtos.html">Coleções / ${escapeHtml(product.categories?.name || "Amoremio")}</a><h1>${escapeHtml(product.name)}</h1><p class="product-price" data-price>${product.promotional_price ? `<s>${money(product.price)}</s> ` : ""}<strong>${money(product.promotional_price ?? product.price)}</strong></p><p class="product-description">${escapeHtml(product.description || "Informações desta peça serão adicionadas em breve.")}</p><div class="product-meta"><div><span>Material</span>${escapeHtml(product.material || "A informar")}</div><div><span>Medidas</span>${escapeHtml(product.dimensions || "A informar")}</div></div>
  <form class="product-form" data-product-form>${variants.length ? `<div class="field"><label for="variant">Variação</label><select id="variant" name="variant" required><option value="">Escolha uma opção</option>${variants.map((variant) => `<option value="${variant.id}" data-stock="${variant.stock}">${escapeHtml(variant.name)}: ${escapeHtml(variant.value)}${Number(variant.price_adjustment) ? ` (${Number(variant.price_adjustment) > 0 ? "+" : ""}${money(variant.price_adjustment)})` : ""}</option>`).join("")}</select></div>` : ""}<div class="product-form__row"><div class="field"><label for="quantity">Quantidade</label><input id="quantity" name="quantity" type="number" min="1" max="${baseStock}" value="1"></div><button class="button" type="submit" ${baseStock <= 0 ? "disabled" : ""}>${baseStock <= 0 ? "Esgotado" : "Adicionar ao carrinho"}</button></div><span class="stock-note" data-stock>${baseStock > 0 ? `${baseStock} unidade${baseStock === 1 ? "" : "s"} disponível${baseStock === 1 ? "" : "is"}` : "Produto esgotado"}</span><p class="product-message" data-message aria-live="polite"></p></form></div>`;
  const gallery = initGallery(images);
  const form = root.querySelector("form"), variantSelect = form.elements.variant, quantity = form.elements.quantity, stockNode = form.querySelector("[data-stock]"), priceNode = root.querySelector("[data-price]");
  variantSelect?.addEventListener("change", () => { const variant = variants.find((item) => item.id === variantSelect.value); const stock = variant ? Number(variant.stock) : baseStock; quantity.max = stock; quantity.value = Math.min(Number(quantity.value), stock) || 1; stockNode.textContent = `${stock} unidade${stock === 1 ? "" : "s"} disponível${stock === 1 ? "" : "is"}`; priceNode.innerHTML = `<strong>${money(productPrice(product, variant))}</strong>`; if (variant?.image_id) gallery.showByReference(variant.image_id); else if (variant?.image_url) gallery.showByReference(variant.image_url); });
  form.addEventListener("submit", (event) => { event.preventDefault(); const variant = variants.find((item) => item.id === variantSelect?.value); if (variants.length && !variant) return form.querySelector("[data-message]").textContent = "Escolha uma variação."; const stock = variant ? Number(variant.stock) : baseStock; addToCart({ productId: product.id, slug: product.slug, name: product.name, imageUrl: variant?.image_url || images[0]?.image_url || "", variantId: variant?.id || null, variantLabel: variant ? `${variant.name}: ${variant.value}` : "", unitPrice: productPrice(product, variant), quantity: Number(quantity.value), stock }); form.querySelector("[data-message]").innerHTML = 'Produto adicionado. <a href="carrinho.html">Ver carrinho</a>'; });
}
