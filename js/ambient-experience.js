const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const weakDevice = (navigator.hardwareConcurrency || 4) <= 2;
const visualSections = [...document.querySelectorAll(".home-visual-section")];
const glassPanels = [...document.querySelectorAll(".home-glass")];

let renderer;
let scene;
let camera;
let particles;
let frameId = 0;
let active = false;
let lastTime = 0;
let pointerX = 0;
let pointerY = 0;
let smoothX = 0;
let smoothY = 0;
let scrollFrame = 0;

function updatePresence(event) {
  pointerX = (event.clientX / innerWidth) * 2 - 1;
  pointerY = -((event.clientY / innerHeight) * 2 - 1);

  const section = event.target.closest?.(".home-visual-section");
  if (!section) return;
  const bounds = section.getBoundingClientRect();
  section.style.setProperty("--presence-x", `${event.clientX - bounds.left}px`);
  section.style.setProperty("--presence-y", `${event.clientY - bounds.top}px`);
}

function tiltElement(element, event, strength) {
  const bounds = element.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  element.style.setProperty(strength === 5 ? "--glass-y" : "--card-y", `${(x - .5) * strength}deg`);
  element.style.setProperty(strength === 5 ? "--glass-x" : "--card-x", `${(.5 - y) * strength * .75}deg`);
  if (strength === 5) {
    element.style.setProperty("--shine-x", `${x * 100}%`);
    element.style.setProperty("--shine-y", `${y * 100}%`);
  }
  element.classList.add("is-alive");
}

function resetTilt(element, glass = false) {
  element.style.setProperty(glass ? "--glass-x" : "--card-x", "0deg");
  element.style.setProperty(glass ? "--glass-y" : "--card-y", "0deg");
  element.classList.remove("is-alive");
}

function updateScrollDepth() {
  scrollFrame = 0;
  const viewportCenter = innerHeight / 2;
  visualSections.forEach((section) => {
    const bounds = section.getBoundingClientRect();
    const distance = (bounds.top + bounds.height / 2 - viewportCenter) / innerHeight;
    const shift = Math.max(-42, Math.min(42, distance * -28));
    const scale = 1.06 + Math.max(0, .012 - Math.abs(distance) * .004);
    section.style.setProperty("--scene-shift", `${shift}px`);
    section.style.setProperty("--scene-scale", scale.toFixed(3));
  });
}

function queueScrollDepth() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollDepth);
}

function prepareLivingHouse() {
  if (reducedMotion.matches) return;
  document.body.classList.add("casa-viva");

  const waterSection = document.querySelector(".home-breath");
  if (waterSection && !waterSection.querySelector(".home-water-reflection")) {
    const water = document.createElement("div");
    water.className = "home-water-reflection";
    water.setAttribute("aria-hidden", "true");
    waterSection.append(water);
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("is-in-view", entry.isIntersecting));
  }, { rootMargin: "8% 0px -12%", threshold: .12 });
  visualSections.forEach((section) => revealObserver.observe(section));

  glassPanels.forEach((panel) => {
    panel.addEventListener("pointermove", (event) => tiltElement(panel, event, 5), { passive: true });
    panel.addEventListener("pointerleave", () => resetTilt(panel, true), { passive: true });
  });

  document.addEventListener("pointermove", (event) => {
    const card = event.target.closest?.(".home-feature-card, .home-memory-card");
    if (card) tiltElement(card, event, 7);
  }, { passive: true });
  document.addEventListener("pointerout", (event) => {
    const card = event.target.closest?.(".home-feature-card, .home-memory-card");
    if (card && !card.contains(event.relatedTarget)) resetTilt(card);
  }, { passive: true });

  addEventListener("scroll", queueScrollDepth, { passive: true });
  updateScrollDepth();
}

function updateTouch(event) {
  const touch = event.touches[0];
  if (!touch) return;
  pointerX = (touch.clientX / innerWidth) * 2 - 1;
  pointerY = -((touch.clientY / innerHeight) * 2 - 1);
}

function resize() {
  if (!renderer || !camera) return;
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 720 ? 1 : 1.35));
  camera.left = -innerWidth / 2;
  camera.right = innerWidth / 2;
  camera.top = innerHeight / 2;
  camera.bottom = -innerHeight / 2;
  camera.updateProjectionMatrix();
}

function render(time) {
  if (!active || document.hidden) return;
  const delta = Math.min((time - lastTime) / 1000 || 0, .04);
  lastTime = time;
  smoothX += (pointerX - smoothX) * .025;
  smoothY += (pointerY - smoothY) * .025;

  const positions = particles.geometry.attributes.position.array;
  const origins = particles.userData.origins;
  for (let index = 0; index < positions.length; index += 3) {
    const particle = index / 3;
    const phase = time * .00012 + particle * 1.73;
    positions[index] = origins[index] + Math.sin(phase) * 9 + smoothX * (8 + particle % 7);
    positions[index + 1] = origins[index + 1] + Math.cos(phase * .78) * 7 + smoothY * (6 + particle % 5);
  }
  particles.geometry.attributes.position.needsUpdate = true;
  particles.rotation.z += delta * .003;
  camera.position.x = smoothX * 7;
  camera.position.y = smoothY * 5;
  renderer.render(scene, camera);
  frameId = requestAnimationFrame(render);
}

function start() {
  if (!renderer || active || document.hidden) return;
  active = true;
  lastTime = performance.now();
  frameId = requestAnimationFrame(render);
}

function stop() {
  active = false;
  cancelAnimationFrame(frameId);
}

function syncExperienceState() {
  if (document.body.classList.contains("experience-open")) start();
  else stop();
}

function destroy() {
  stop();
  particles?.geometry.dispose();
  particles?.material.dispose();
  renderer?.dispose();
  renderer?.domElement.remove();
}

async function createExperience() {
  if (reducedMotion.matches || weakDevice || !visualSections.length) return;

  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js");
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.domElement.className = "home-ambient-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    document.body.append(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-innerWidth / 2, innerWidth / 2, innerHeight / 2, -innerHeight / 2, -10, 10);
    camera.position.z = 2;

    const count = innerWidth < 720 ? 18 : 42;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - .5) * innerWidth;
      positions[index * 3 + 1] = (Math.random() - .5) * innerHeight;
      positions[index * 3 + 2] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffe1a8,
      size: innerWidth < 720 ? 2.2 : 3,
      transparent: true,
      opacity: .45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false,
    });
    particles = new THREE.Points(geometry, material);
    particles.userData.origins = positions.slice();
    scene.add(particles);

    resize();
    addEventListener("resize", resize, { passive: true });
    addEventListener("pointermove", updatePresence, { passive: true });
    addEventListener("touchmove", updateTouch, { passive: true });
    document.addEventListener("visibilitychange", () => document.hidden ? stop() : syncExperienceState());
    addEventListener("pagehide", destroy, { once: true });
    new MutationObserver(syncExperienceState).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    syncExperienceState();
  } catch (error) {
    console.info("Experiência ambiente indisponível; mantendo a versão estática.", error);
  }
}

prepareLivingHouse();
createExperience();
