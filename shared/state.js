/**
 * state — Settings store with pub/sub notification.
 *
 * Interface:
 *   subscribe(fn)                  → unsubscribe()
 *   getSettings()                  → settings
 *   togglePrayerNotif(id)          → void
 *   setReminderOffset(min)         → void
 *   toggleJumuah()                 → void
 *   toggleNews()                   → void
 */

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeSettings,
} from './notification-settings.js';

const STORE_KEY = 'scm_settings';

let settings = loadSettings();
let subscribers = [];

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) return normalizeSettings(saved);
  } catch (e) {
    /* corrupt — use defaults */
  }
  return structuredClone(DEFAULT_NOTIFICATION_SETTINGS);
}

function saveSettings() {
  localStorage.setItem(STORE_KEY, JSON.stringify(settings));
}

function notify() {
  subscribers.forEach((fn) => fn(settings));
}

// ── Public interface ──

/**
 * Subscribe to all settings changes.
 * Returns an unsubscribe function.
 */
export function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter((s) => s !== fn);
  };
}

export function getSettings() {
  return settings;
}

export function togglePrayerNotif(id) {
  settings.notif[id] = !settings.notif[id];
  saveSettings();
  notify();
}

export function setReminderOffset(min) {
  settings.remind = min;
  saveSettings();
  notify();
}

export function toggleJumuah() {
  settings.jumuah = !settings.jumuah;
  saveSettings();
  notify();
}

export function toggleNews() {
  settings.news = !settings.news;
  saveSettings();
  notify();
}
