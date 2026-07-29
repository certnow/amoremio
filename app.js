const storefront = document.querySelector(".storefront");
const entrance = document.querySelector(".entrance");

entrance.addEventListener("click", () => {
  storefront.classList.toggle("is-open");
});
