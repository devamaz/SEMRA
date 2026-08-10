/**
 * adhan-reminders — pure scheduling for server-fired Adhan / Jumu'ah reminders.
 *
 * Mosque local time: Africa/Lagos (ADR 0004).
 */

import { normalizeSettings, getPrayerIds } from '../shared/notification-settings.js';

export const MOSQUE_TZ = 'Africa/Lagos';
export const FRESHNESS_MS = 60_000;
export const JUMAH_LEAD_MINUTES = 30;

/**
 * Parse "H:MM AM/PM" → 24h { h, m }.
 */
export function parseTime12(str) {
  const m = String(str || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = +m[1];
  const min = +m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return { h, m: min };
}

/**
 * Wall-clock parts for `date` in the mosque timezone.
 */
export function getMosqueParts(date = new Date(), timeZone = MOSQUE_TZ) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  });
  const map = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: +map.hour,
    minute: +map.minute,
    second: +map.second,
    weekday: map.weekday, // Mon, Tue, ... Fri
  };
}

export function dateKeyFromParts(parts) {
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

export function isFriday(parts) {
  return parts.weekday === 'Fri';
}

/**
 * Convert a mosque-local wall time to UTC epoch ms.
 */
export function mosqueWallToUtcMs(year, month, day, hour, minute, second = 0, timeZone = MOSQUE_TZ) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const shown = getMosqueParts(new Date(utcGuess), timeZone);
  const shownAsUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
    shown.second,
  );
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return utcGuess + (targetAsUtc - shownAsUtc);
}

/**
 * Subtract minutes from a wall clock; may roll to previous calendar day.
 */
export function subtractMinutes(h, m, deltaMin) {
  let total = h * 60 + m - deltaMin;
  let dayDelta = 0;
  while (total < 0) {
    total += 1440;
    dayDelta -= 1;
  }
  return { h: Math.floor(total / 60), m: total % 60, dayDelta };
}

function addCalendarDays(year, month, day, dayDelta) {
  const dt = new Date(Date.UTC(year, month - 1, day + dayDelta));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function prayerLabel(id) {
  if (id === 'jumuah') return "Jumu'ah";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Whether `nowMs` falls in the fire window [fireUtc, fireUtc + freshness).
 */
export function isWithinFreshness(nowMs, fireUtc, freshnessMs = FRESHNESS_MS) {
  const delta = nowMs - fireUtc;
  return delta >= 0 && delta < freshnessMs;
}

/**
 * Fire window for one reminder candidate: parse the wall time, apply the
 * lead offset, convert to mosque-local UTC, then check the sent-log and
 * freshness window. Shared by the prayer loop and the Jumu'ah reminder.
 *
 * @returns {{ sentKey: string } | null}
 */
function fireWindow({
  id,
  timeStr,
  offsetMin,
  enabled,
  parts,
  dateKey,
  endpoint,
  nowMs,
  sentLog,
  timeZone,
  freshnessMs,
}) {
  if (!enabled) return null;
  const parsed = parseTime12(timeStr);
  if (!parsed) return null;
  const shifted = subtractMinutes(parsed.h, parsed.m, offsetMin);
  const cal = addCalendarDays(parts.year, parts.month, parts.day, shifted.dayDelta);
  const fireUtc = mosqueWallToUtcMs(
    cal.year,
    cal.month,
    cal.day,
    shifted.h,
    shifted.m,
    0,
    timeZone,
  );
  const sentKey = `${dateKey}:${endpoint}:${id}`;
  if (sentLog[sentKey] || !isWithinFreshness(nowMs, fireUtc, freshnessMs)) return null;
  return { sentKey };
}

/**
 * Due Adhan / Jumu'ah reminders for one Subscriber at `now`.
 *
 * @returns {{ id: string, sentKey: string, title: string, body: string }[]}
 */
export function dueRemindersForSubscriber({
  now = new Date(),
  times,
  settings: rawSettings,
  endpoint,
  sentLog = {},
  timeZone = MOSQUE_TZ,
  freshnessMs = FRESHNESS_MS,
}) {
  if (!endpoint || !times) return [];

  const settings = normalizeSettings(rawSettings);
  const parts = getMosqueParts(now, timeZone);
  const dateKey = dateKeyFromParts(parts);
  const friday = isFriday(parts);
  const nowMs = now.getTime();
  const due = [];

  for (const id of getPrayerIds()) {
    if (friday && id === 'dhuhr') continue;

    const win = fireWindow({
      id,
      timeStr: times[id],
      offsetMin: settings.remind,
      enabled: settings.notif[id],
      parts,
      dateKey,
      endpoint,
      nowMs,
      sentLog,
      timeZone,
      freshnessMs,
    });
    if (!win) continue;

    const timeLabel = times[id];
    const offsetNote =
      settings.remind === 0 ? 'now' : `in ${settings.remind} min`;
    due.push({
      id,
      sentKey: win.sentKey,
      title: `${prayerLabel(id)} Adhan`,
      body:
        settings.remind === 0
          ? `${prayerLabel(id)} · ${timeLabel}`
          : `${prayerLabel(id)} at ${timeLabel} (${offsetNote})`,
    });
  }

  // Jumu'ah replaces the Dhuhr reminder on Fridays (ADR 0004) — same
  // fire-window rules, just a different lead time and toggle.
  const jumuahWin = fireWindow({
    id: 'jumuah',
    timeStr: times.khutbah,
    offsetMin: JUMAH_LEAD_MINUTES,
    enabled: friday && settings.jumuah,
    parts,
    dateKey,
    endpoint,
    nowMs,
    sentLog,
    timeZone,
    freshnessMs,
  });
  if (jumuahWin) {
    due.push({
      id: 'jumuah',
      sentKey: jumuahWin.sentKey,
      title: "Jumu'ah reminder",
      body: `Khutbah at ${times.khutbah} · Iqamah ${times.jumuah || ''}`.trim(),
    });
  }

  return due;
}

/**
 * Collect due pushes across all Subscribers.
 *
 * @returns {{ endpoint: string, subscriber: object, reminder: object }[]}
 */
export function collectDueReminders({
  now = new Date(),
  times,
  subscribers,
  sentLog = {},
  timeZone = MOSQUE_TZ,
  freshnessMs = FRESHNESS_MS,
}) {
  const out = [];
  for (const sub of subscribers) {
    if (!sub?.endpoint) continue;
    const reminders = dueRemindersForSubscriber({
      now,
      times,
      settings: sub.settings,
      endpoint: sub.endpoint,
      sentLog,
      timeZone,
      freshnessMs,
    });
    for (const reminder of reminders) {
      out.push({ endpoint: sub.endpoint, subscriber: sub, reminder });
    }
  }
  return out;
}

/**
 * Drop sent-log keys that are not for today or yesterday (mosque calendar).
 */
export function pruneSentLog(sentLog, now = new Date(), timeZone = MOSQUE_TZ) {
  const parts = getMosqueParts(now, timeZone);
  const today = dateKeyFromParts(parts);
  const y = addCalendarDays(parts.year, parts.month, parts.day, -1);
  const yesterday = dateKeyFromParts({ ...y, weekday: '' });
  const keep = {};
  for (const [key, val] of Object.entries(sentLog || {})) {
    if (key.startsWith(today) || key.startsWith(yesterday)) keep[key] = val;
  }
  return keep;
}
