import { setupCurtain } from "./curtain.js";

const storefront = document.querySelector(".entry-screen");
const entrance = document.querySelector(".js-open-house");

if (storefront && entrance) setupCurtain(storefront, entrance);
