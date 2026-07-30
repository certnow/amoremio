export function setupCurtain(storefront, entrance) {
  const allowsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const skipButtons = document.querySelectorAll(".js-skip-entry");
  const sessionKey = "amoremio-house-opened";

  const revealStore = ({ immediate = false } = {}) => {
    sessionStorage.setItem(sessionKey, "true");
    entrance.setAttribute("aria-expanded", "true");

    if (immediate || !allowsMotion) {
      document.body.classList.add("experience-open");
      document.querySelector("#inicio-loja")?.focus({ preventScroll: true });
      return;
    }

    storefront.classList.add("is-leaving");
    window.setTimeout(() => {
      document.body.classList.add("experience-open");
      document.querySelector("#inicio-loja")?.scrollIntoView({ block: "start" });
      document.querySelector("#inicio-loja .home-search input")?.focus({ preventScroll: true });
    }, 760);
  };

  entrance.addEventListener("click", () => revealStore());
  skipButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      revealStore({ immediate: true });
      document.querySelector("#inicio-loja")?.scrollIntoView({ block: "start" });
    });
  });

  if (sessionStorage.getItem(sessionKey) === "true") revealStore({ immediate: true });
}
