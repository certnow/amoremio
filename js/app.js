import { setupCurtain } from "./curtain.js";

const storefront = document.querySelector(".storefront");
const entrance = document.querySelector(".entrance");

if (storefront && entrance) setupCurtain(storefront, entrance);
