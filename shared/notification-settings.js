/**
 * notification-settings — defaults and normalisation for Subscriber prefs.
 *
 * Shared by the User app (state) and the server (Subscriber records).
 */

export const DEFAULT_NOTIFICATION_SETTINGS = {
  notif: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  remind: 5,
  jumuah: true,
  news: true,
};

const PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const ALLOWED_REMIND = new Set([0, 5, 10, 15]);

/**
 * Coerce unknown input into a full Notification settings object.
 * Bare / missing prefs → app defaults (ADR 0004).
 */
export function normalizeSettings(input) {
  const base = structuredClone(DEFAULT_NOTIFICATION_SETTINGS);
  if (!input || typeof input !== 'object') return base;

  if (input.notif && typeof input.notif === 'object') {
    for (const id of PRAYER_IDS) {
      if (typeof input.notif[id] === 'boolean') {
        base.notif[id] = input.notif[id];
      }
    }
  }

  if (ALLOWED_REMIND.has(input.remind)) {
    base.remind = input.remind;
  } else if (ALLOWED_REMIND.has(Number(input.remind))) {
    base.remind = Number(input.remind);
  }

  if (typeof input.jumuah === 'boolean') base.jumuah = input.jumuah;
  if (typeof input.news === 'boolean') base.news = input.news;

  return base;
}

export function getPrayerIds() {
  return [...PRAYER_IDS];
}
