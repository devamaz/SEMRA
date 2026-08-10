/**
 * install — In-app PWA install prompt (beforeinstallprompt + iOS tip).
 *
 * Chromium fires beforeinstallprompt when installable; we stash it and
 * show UI. iOS has no event — show Add to Home Screen instructions instead.
 */

const DISMISS_KEY = "scm_install_dismissed";

let deferredPrompt = null;
let installed = detectStandalone();
let listeners = [];

function detectStandalone() {
  try {
    if (window.navigator.standalone === true) return true;
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch (e) {
    /* ignore */
  }
  return false;
}

function isIos() {
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function notify() {
  const snap = getState();
  listeners.forEach((fn) => {
    try {
      fn(snap);
    } catch (e) {
      /* listener error */
    }
  });
}

export function init() {
  if (installed) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch (e) {
      /* ignore */
    }
    notify();
  });
}

/**
 * @returns {{
 *   installed: boolean,
 *   canPrompt: boolean,
 *   showIosTip: boolean,
 *   dismissed: boolean
 * }}
 */
export function getState() {
  const dismissed = isDismissed();
  return {
    installed,
    canPrompt: !installed && !!deferredPrompt && !dismissed,
    showIosTip: !installed && !deferredPrompt && isIos() && !dismissed,
    dismissed,
  };
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}

/** Open the browser install dialog. */
export async function promptInstall() {
  if (!deferredPrompt) return { outcome: "unavailable" };
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  notify();
  return choice;
}

/** Hide install UI until storage is cleared (or app is installed). */
export function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch (e) {
    /* ignore */
  }
  notify();
}

/** Re-show install UI (e.g. from Settings). */
export function clearDismiss() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch (e) {
    /* ignore */
  }
  notify();
}
