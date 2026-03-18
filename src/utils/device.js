import {
  browserName,
  deviceType,
  isAndroid,
  isBrowser,
  isConsole,
  isEdge,
  isFirefox,
  isIOS,
  isMacOs,
  isMobile,
  isMobileOnly,
  isSafari,
  isChrome,
  isSmartTV,
  isTablet,
  isWearable,
  isWindows,
  osName
} from "react-device-detect";

const CLASS_PREFIXES = [
  "device-",
  "os-",
  "browser-",
  "input-",
  "hover-",
  "motion-"
];

let listenersAttached = false;

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function clearDeviceClasses(target) {
  const { classList } = target;
  [...classList].forEach((cls) => {
    if (CLASS_PREFIXES.some((prefix) => cls.startsWith(prefix))) {
      classList.remove(cls);
    }
  });
}

export function getDeviceInfo() {
  const device =
    (isMobileOnly && "mobile") ||
    (isTablet && "tablet") ||
    (isSmartTV && "smarttv") ||
    (isConsole && "console") ||
    (isWearable && "wearable") ||
    (isBrowser && "browser") ||
    deviceType ||
    "unknown";

  const os =
    (isIOS && "ios") ||
    (isAndroid && "android") ||
    (isWindows && "windows") ||
    (isMacOs && "macos") ||
    osName ||
    "unknown";

  const browser =
    (isSafari && "safari") ||
    (isChrome && "chrome") ||
    (isFirefox && "firefox") ||
    (isEdge && "edge") ||
    browserName ||
    "unknown";

  return { device, os, browser, isMobile };
}

function getInputInfo() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return {
      input: "unknown",
      hover: "unknown",
      motion: "ok"
    };
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hoverNone = window.matchMedia("(hover: none)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    input: coarse ? "coarse" : fine ? "fine" : "unknown",
    hover: hoverNone ? "none" : "hover",
    motion: reduce ? "reduce" : "ok"
  };
}

function applyInputClasses(target) {
  const info = getInputInfo();
  target.classList.add(`input-${info.input}`);
  target.classList.add(`hover-${info.hover}`);
  target.classList.add(`motion-${info.motion}`);
}

export function applyDeviceClasses(target = document.documentElement) {
  if (!target) return;
  const info = getDeviceInfo();
  clearDeviceClasses(target);
  target.classList.add(`device-${toSlug(info.device)}`);
  target.classList.add(`os-${toSlug(info.os)}`);
  target.classList.add(`browser-${toSlug(info.browser)}`);
  applyInputClasses(target);

  if (listenersAttached || typeof window === "undefined" || !window.matchMedia) return;
  listenersAttached = true;
  const hoverQuery = window.matchMedia("(hover: none)");
  const pointerQuery = window.matchMedia("(pointer: coarse)");
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const refresh = () => applyDeviceClasses(target);
  hoverQuery.addEventListener?.("change", refresh);
  pointerQuery.addEventListener?.("change", refresh);
  motionQuery.addEventListener?.("change", refresh);
}
