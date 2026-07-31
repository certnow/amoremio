import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import {
  createVisibilityController,
  getPortalPerformanceProfile,
} from "./portal-performance.js";

const root = document.querySelector("[data-portal-root]");
const canvasHost = document.querySelector("[data-portal-canvas]");
const status = document.querySelector("[data-portal-status]");
const progress = document.querySelector("[data-portal-progress]");
const productTextureUrl =
  "./assets/portal-inox/product-ring-placeholder.png";
const forceFallback =
  new URLSearchParams(window.location.search).get("fallback") === "1";

const profile = getPortalPerformanceProfile();
const pointer = new THREE.Vector2();
const pointerTarget = new THREE.Vector2();
const clock = new THREE.Clock();
const cleanupTasks = [];

let renderer;
let scene;
let camera;
let portalGroup;
let productGroup;
let productMaterial;
let floorMaterial;
let particles;
let animationFrame = 0;
let paused = false;
let destroyed = false;
let scrollProgress = 0;

if (forceFallback || profile.tier === "fallback" || profile.reducedMotion) {
  activateStaticExperience(
    forceFallback
      ? "Versão estática de teste"
      : profile.reducedMotion
      ? "Versão estática: redução de movimento ativada"
      : "Versão estática otimizada para este dispositivo",
  );
} else {
  startPortal().catch((error) => {
    console.error("Portal Inox: não foi possível iniciar o WebGL.", error);
    activateStaticExperience("Versão estática disponível");
  });
}

async function startPortal() {
  if (!window.gsap || !window.ScrollTrigger) {
    throw new Error("GSAP ou ScrollTrigger indisponível.");
  }

  window.gsap.registerPlugin(window.ScrollTrigger);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xded4c4);
  scene.fog = new THREE.FogExp2(0xcfc3b0, 0.045);

  camera = new THREE.PerspectiveCamera(
    34,
    window.innerWidth / window.innerHeight,
    0.1,
    60,
  );
  camera.position.set(0, 0.25, 8.8);

  renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: profile.tier === "desktop",
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(profile.pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.shadowMap.enabled = profile.tier === "desktop";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  canvasHost.append(renderer.domElement);

  buildLighting();
  buildArchitecture();
  buildLiquidFloor();
  buildParticles();
  await buildProduct();
  bindInteraction();
  bindScrollStory();

  root.dataset.state = "ready";
  status.textContent = "Experiência pronta";
  animationFrame = requestAnimationFrame(render);
}

function buildLighting() {
  const hemisphere = new THREE.HemisphereLight(0xfff8e9, 0x6a715d, 1.7);
  scene.add(hemisphere);

  const key = new THREE.SpotLight(0xffe4b0, 90, 25, Math.PI / 5, 0.65, 1.4);
  key.position.set(3.6, 6, 5);
  key.target.position.set(0, 0.25, 0);
  key.castShadow = profile.tier === "desktop";
  scene.add(key, key.target);

  const silverRim = new THREE.PointLight(0xdde4e3, 22, 15, 1.7);
  silverRim.position.set(-4, 1, 2);
  silverRim.userData.followsPointer = true;
  scene.add(silverRim);

  const oliveFill = new THREE.PointLight(0x7d856a, 13, 12, 1.8);
  oliveFill.position.set(3, -1.5, 1);
  scene.add(oliveFill);
}

function createArchShape(width, height, openingWidth, openingHeight) {
  const base = -height / 2;
  const shoulder = height * 0.05;
  const top = height / 2;
  const half = width / 2;
  const openHalf = openingWidth / 2;
  const openTop = base + openingHeight;
  const openShoulder = base + openingHeight * 0.47;

  const shape = new THREE.Shape();
  shape.moveTo(-half, base);
  shape.lineTo(half, base);
  shape.lineTo(half, shoulder);
  shape.bezierCurveTo(half, top * 0.72, width * 0.28, top, 0, top);
  shape.bezierCurveTo(-width * 0.28, top, -half, top * 0.72, -half, shoulder);
  shape.closePath();

  const opening = new THREE.Path();
  opening.moveTo(-openHalf, base - 0.15);
  opening.bezierCurveTo(
    -openHalf,
    openShoulder,
    -openingWidth * 0.28,
    openTop,
    0,
    openTop,
  );
  opening.bezierCurveTo(
    openingWidth * 0.28,
    openTop,
    openHalf,
    openShoulder,
    openHalf,
    base - 0.15,
  );
  opening.closePath();
  shape.holes.push(opening);

  return shape;
}

function buildArchitecture() {
  portalGroup = new THREE.Group();
  portalGroup.position.y = 0.1;
  scene.add(portalGroup);

  const archLayers = [
    {
      width: 6.2,
      height: 7.3,
      openingWidth: 4.55,
      openingHeight: 6.15,
      depth: 0.46,
      z: -1.4,
      color: 0xe6ddcf,
      metalness: 0.12,
      roughness: 0.58,
    },
    {
      width: 5.25,
      height: 6.55,
      openingWidth: 4.45,
      openingHeight: 6.05,
      depth: 0.25,
      z: -0.65,
      color: 0xb49b70,
      metalness: 0.62,
      roughness: 0.33,
    },
    {
      width: 4.72,
      height: 6.05,
      openingWidth: 4.25,
      openingHeight: 5.75,
      depth: 0.16,
      z: -0.18,
      color: 0xd6d5cf,
      metalness: 0.76,
      roughness: 0.24,
    },
  ];

  archLayers.forEach((layer, index) => {
    const shape = createArchShape(
      layer.width,
      layer.height,
      layer.openingWidth,
      layer.openingHeight,
    );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: layer.depth,
      bevelEnabled: true,
      bevelSegments: profile.tier === "desktop" ? 4 : 2,
      bevelSize: index === 0 ? 0.09 : 0.045,
      bevelThickness: 0.045,
      curveSegments: profile.tier === "desktop" ? 32 : 18,
    });
    geometry.center();

    const material = new THREE.MeshPhysicalMaterial({
      color: layer.color,
      metalness: layer.metalness,
      roughness: layer.roughness,
      clearcoat: index === 2 ? 0.55 : 0.12,
      clearcoatRoughness: 0.28,
    });

    const arch = new THREE.Mesh(geometry, material);
    arch.position.z = layer.z;
    arch.castShadow = profile.tier === "desktop";
    arch.receiveShadow = true;
    arch.userData.baseZ = layer.z;
    arch.userData.depthFactor = index + 1;
    portalGroup.add(arch);
  });

  const innerGlow = new THREE.Mesh(
    new THREE.CircleGeometry(2.25, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffedc8,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  innerGlow.scale.y = 1.35;
  innerGlow.position.set(0, 0.2, -1.75);
  portalGroup.add(innerGlow);
}

function buildLiquidFloor() {
  const geometry = new THREE.PlaneGeometry(
    26,
    25,
    profile.floorSegments,
    profile.floorSegments,
  );

  floorMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uSand: { value: new THREE.Color(0xb7aa97) },
      uSilver: { value: new THREE.Color(0xc9ccc7) },
      uOlive: { value: new THREE.Color(0x69705f) },
    },
    vertexShader: `
      uniform float uTime;
      varying float vWave;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 transformed = position;
        float waveA = sin((position.x * 1.5) + uTime * 0.45) * 0.035;
        float waveB = cos((position.y * 1.1) - uTime * 0.3) * 0.028;
        transformed.z += waveA + waveB;
        vWave = transformed.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSand;
      uniform vec3 uSilver;
      uniform vec3 uOlive;
      uniform float uTime;
      varying float vWave;
      varying vec2 vUv;

      void main() {
        float horizon = smoothstep(0.0, 0.84, vUv.y);
        float line = sin((vUv.x * 35.0) + (vUv.y * 12.0) + uTime * 0.35);
        float shimmer = smoothstep(0.82, 1.0, line) * 0.1;
        vec3 base = mix(uOlive, uSilver, horizon);
        base = mix(base, uSand, 0.34 + vWave * 2.0);
        gl_FragColor = vec4(base + shimmer, 0.76);
      }
    `,
  });

  const floor = new THREE.Mesh(geometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -3.05, -2.5);
  scene.add(floor);
}

function buildParticles() {
  if (!profile.particleCount) {
    return;
  }

  const positions = new Float32Array(profile.particleCount * 3);
  for (let index = 0; index < profile.particleCount; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 11;
    positions[index * 3 + 1] = Math.random() * 7 - 2.6;
    positions[index * 3 + 2] = Math.random() * 7 - 4.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xfff2d2,
    size: profile.tier === "mobile" ? 0.022 : 0.027,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

async function buildProduct() {
  const texture = await new THREE.TextureLoader().loadAsync(productTextureUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  productMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });

  const product = new THREE.Mesh(
    new THREE.PlaneGeometry(3.15, 3.15),
    productMaterial,
  );
  product.position.z = 0.65;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 48),
    new THREE.MeshBasicMaterial({
      color: 0x4a493f,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  shadow.scale.y = 0.24;
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.7, 0.05);

  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.75, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffe7b5,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.position.z = 0.35;

  productGroup = new THREE.Group();
  productGroup.add(halo, product, shadow);
  productGroup.rotation.z = -0.12;
  productGroup.scale.setScalar(profile.tier === "mobile" ? 0.65 : 1);
  scene.add(productGroup);
}

function bindInteraction() {
  const updatePointer = (event) => {
    pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointerTarget.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(profile.pixelRatio);
    window.ScrollTrigger?.refresh();
  };

  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });

  cleanupTasks.push(() => {
    window.removeEventListener("pointermove", updatePointer);
    window.removeEventListener("resize", handleResize);
  });

  cleanupTasks.push(
    createVisibilityController({
      onPause: () => {
        paused = true;
        cancelAnimationFrame(animationFrame);
      },
      onResume: () => {
        if (!destroyed && paused) {
          paused = false;
          clock.getDelta();
          animationFrame = requestAnimationFrame(render);
        }
      },
    }),
  );
}

function bindScrollStory() {
  const gsap = window.gsap;
  const opening = document.querySelector(".portal-chapter--opening .portal-copy");
  const story = document.querySelector(".portal-chapter--story .portal-copy");
  const closing = document.querySelector(".portal-chapter--closing .portal-copy");

  gsap.set(opening, { autoAlpha: 1, y: 0 });

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.7,
      onUpdate: ({ progress: current }) => {
        scrollProgress = current;
        root.style.setProperty("--page-progress", `${current * 100}%`);
      },
    },
  });

  timeline
    .to(opening, { autoAlpha: 0, y: -38, duration: 0.16 }, 0.08)
    .to(productMaterial, { opacity: 1, duration: 0.3 }, 0.17)
    .to(story, { autoAlpha: 1, y: 0, duration: 0.16 }, 0.32)
    .to(story, { autoAlpha: 0, y: -35, duration: 0.13 }, 0.58)
    .to(closing, { autoAlpha: 1, y: 0, duration: 0.16 }, 0.74);

  cleanupTasks.push(() => {
    timeline.scrollTrigger?.kill();
    timeline.kill();
  });
}

function render() {
  if (destroyed || paused) {
    return;
  }

  const elapsed = clock.getElapsedTime();
  pointer.lerp(pointerTarget, 0.035);

  camera.position.x +=
    (pointer.x * (profile.mobile ? 0.09 : 0.2) - camera.position.x) * 0.025;
  camera.position.y +=
    (0.25 + pointer.y * 0.12 + scrollProgress * 0.28 - camera.position.y) *
    0.025;
  camera.position.z = THREE.MathUtils.lerp(
    8.8,
    profile.mobile ? 7.2 : 5.65,
    scrollProgress,
  );
  camera.lookAt(0, 0.05, -0.45);

  if (productGroup) {
    const storyFocus = Math.max(
      0,
      1 - Math.abs(scrollProgress - 0.46) / 0.24,
    );
    const compactLayout = window.innerWidth <= 720;
    const storyOffset = compactLayout ? 0 : -1.85 * storyFocus;
    const productTargetX =
      pointer.x * (profile.mobile ? 0.08 : 0.22) + storyOffset;
    productGroup.position.x +=
      (productTargetX - productGroup.position.x) * 0.025;
    productGroup.position.y =
      Math.sin(elapsed * 0.52) * 0.065 + pointer.y * 0.055;
    productGroup.rotation.y =
      pointer.x * 0.08 + Math.sin(elapsed * 0.23) * 0.025;
    productGroup.rotation.x = -pointer.y * 0.035;
  }

  portalGroup?.children.forEach((child) => {
    if (!child.userData.depthFactor) {
      return;
    }
    child.position.x =
      pointer.x * 0.025 * child.userData.depthFactor;
    child.position.z =
      child.userData.baseZ +
      pointer.y * 0.018 * child.userData.depthFactor;
  });

  const rimLight = scene.children.find(
    (child) => child.userData.followsPointer,
  );
  if (rimLight) {
    rimLight.position.x = -3.7 + pointer.x * 1.25;
    rimLight.position.y = 1 + pointer.y * 0.8;
  }

  if (particles) {
    particles.rotation.y = elapsed * 0.012;
    particles.position.y = Math.sin(elapsed * 0.18) * 0.04;
  }

  if (floorMaterial) {
    floorMaterial.uniforms.uTime.value = elapsed;
  }

  renderer.render(scene, camera);
  animationFrame = requestAnimationFrame(render);
}

function activateStaticExperience(message) {
  root.dataset.state = "fallback";
  status.textContent = message;
  root.style.setProperty("--page-progress", "0%");

  const copies = root.querySelectorAll(".portal-copy");
  copies.forEach((copy) => {
    copy.style.opacity = "1";
    copy.style.transform = "none";
  });

  const handleStaticScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const current = max > 0 ? window.scrollY / max : 0;
    root.style.setProperty("--page-progress", `${current * 100}%`);
  };

  window.addEventListener("scroll", handleStaticScroll, { passive: true });
  cleanupTasks.push(() =>
    window.removeEventListener("scroll", handleStaticScroll),
  );
}

function disposePortal() {
  if (destroyed) {
    return;
  }

  destroyed = true;
  paused = true;
  cancelAnimationFrame(animationFrame);
  cleanupTasks.splice(0).forEach((cleanup) => cleanup());

  if (scene) {
    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.filter(Boolean).forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value?.isTexture) {
            value.dispose();
          }
        });
        material.dispose?.();
      });
    });
    scene.clear();
  }

  window.ScrollTrigger?.getAll().forEach((trigger) => trigger.kill());
  renderer?.renderLists?.dispose();
  renderer?.dispose();
  renderer?.forceContextLoss();
}

window.addEventListener("pagehide", disposePortal, { once: true });
