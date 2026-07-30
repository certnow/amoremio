export const CART_STORAGE_KEY = "amoremio-cart-v1";

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch { return []; }
}
function save(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("amoremio:cart", { detail: cart }));
  return cart;
}
export function addToCart(item) {
  const cart = getCart();
  const key = `${item.productId}:${item.variantId || "base"}`;
  const current = cart.find((entry) => entry.key === key);
  const limit = Number(item.stock || 0);
  if (current) current.quantity = Math.min(current.quantity + Number(item.quantity || 1), limit);
  else cart.push({ ...item, key, quantity: Math.min(Number(item.quantity || 1), limit) });
  save(cart); return cart;
}
export function updateCartItem(key, quantity) {
  const cart = getCart(); const item = cart.find((entry) => entry.key === key);
  if (!item) return cart;
  if (quantity <= 0) return removeCartItem(key);
  item.quantity = Math.min(Number(quantity), Number(item.stock)); return save(cart);
}
export function removeCartItem(key) { return save(getCart().filter((item) => item.key !== key)); }
export function clearCart() { return save([]); }
export const cartCount = () => getCart().reduce((sum, item) => sum + Number(item.quantity), 0);
export const cartSubtotal = () => getCart().reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
