const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MOBILE_QUERY = "(max-width: 760px), (pointer: coarse)";

export function canUseWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
    });

    if (!context) {
      return false;
    }

    const loseContext = context.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function getPortalPerformanceProfile() {
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const mobile = window.matchMedia(MOBILE_QUERY).matches;
  const memory = Number(navigator.deviceMemory || 8);
  const cores = Number(navigator.hardwareConcurrency || 8);
  const saveData = Boolean(navigator.connection?.saveData);
  const weakDevice = memory <= 2 || cores <= 2 || saveData;
  const devicePixelRatio = window.devicePixelRatio || 1;

  let tier = "desktop";
  if (weakDevice || !canUseWebGL()) {
    tier = "fallback";
  } else if (mobile) {
    tier = "mobile";
  }

  return {
    tier,
    reducedMotion,
    mobile,
    animate: tier !== "fallback" && !reducedMotion,
    pixelRatio:
      tier === "desktop"
        ? Math.min(devicePixelRatio, 1.5)
        : Math.min(devicePixelRatio, 1.1),
    particleCount:
      reducedMotion || tier === "fallback" ? 0 : tier === "mobile" ? 70 : 220,
    floorSegments: tier === "mobile" ? 40 : 72,
  };
}

export function createVisibilityController({ onPause, onResume }) {
  const handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      onPause();
      return;
    }

    onResume();
  };

  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
