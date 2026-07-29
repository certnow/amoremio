const storefront = document.querySelector(".storefront");
const entrance = document.querySelector(".entrance");
const allowsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

entrance.addEventListener("click", () => {
  storefront.classList.add("is-open");
  entrance.setAttribute("aria-expanded", "true");
});

if (allowsMotion) {
  let frame;

  storefront.addEventListener("pointermove", (event) => {
    if (frame) return;

    frame = requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;

      storefront.style.setProperty("--pointer-x", x.toFixed(3));
      storefront.style.setProperty("--pointer-y", y.toFixed(3));
      frame = undefined;
    });
  });

  storefront.addEventListener("pointerleave", () => {
    storefront.style.setProperty("--pointer-x", 0);
    storefront.style.setProperty("--pointer-y", 0);
  });
}
