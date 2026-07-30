export const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
export const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
export const productPrice = (product, variant = null) => Number(product.promotional_price ?? product.price ?? 0) + Number(variant?.price_adjustment || 0);
export const firstImage = (product) => [...(product.product_images || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)[0];
export const debounce = (fn, delay = 250) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); }; };
