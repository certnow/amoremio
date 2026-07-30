import { cartCount } from "./cart.js";
import { initHouseMusic } from "./music.js?v=20260730-1";

export function updateCartBadges() { document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = cartCount(); }); }
export function initStoreShell() {
  initHouseMusic();
  updateCartBadges(); window.addEventListener("amoremio:cart", updateCartBadges);
  document.querySelectorAll("[data-menu-toggle]").forEach((button) => button.addEventListener("click", () => {
    const nav = document.querySelector(".store-nav"); const open = nav?.classList.toggle("is-open"); button.setAttribute("aria-expanded", String(Boolean(open)));
  }));
}
