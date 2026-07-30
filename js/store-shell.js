import { cartCount } from "./cart.js";

export function updateCartBadges() { document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = cartCount(); }); }
export function initStoreShell() {
  updateCartBadges(); window.addEventListener("amoremio:cart", updateCartBadges);
  document.querySelectorAll("[data-menu-toggle]").forEach((button) => button.addEventListener("click", () => {
    const nav = document.querySelector(".store-nav"); const open = nav?.classList.toggle("is-open"); button.setAttribute("aria-expanded", String(Boolean(open)));
  }));
}
