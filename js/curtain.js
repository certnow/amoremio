export function setupCurtain(storefront, entrance) {
  const allowsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame;

  const open = () => {
    storefront.classList.add("is-open");
    document.body.classList.add("experience-open");
    entrance.setAttribute("aria-expanded", "true");
    window.setTimeout(() => document.querySelector(".reveal-copy .button")?.focus(), allowsMotion ? 1750 : 0);
  };

  entrance.addEventListener("click", open);

  if (!allowsMotion) return;

  storefront.addEventListener("pointermove", (event) => {
    if (frame || storefront.classList.contains("is-open")) return;
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

  document.addEventListener("visibilitychange", () => {
    storefront.classList.toggle("is-paused", document.hidden);
  });
}
