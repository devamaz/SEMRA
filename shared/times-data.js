/**
 * times-data — Prayer definitions, time math, localStorage persistence,
 *              and server sync.
 *
 * Interface:
 *   init()                    → Promise<void>  (fetches times from server)
 *   getPrayers()              → Prayer[]
 *   getTime(id)               → "HH:MM AM/PM"
 *   setTime(id, timeStr)      → Promise<void>
 *   to24(str)                 → {h, m}
 *   to12(h, m)                → "HH:MM AM/PM"
 *   nextPrayerSlot()          → Prayer | null
 */

const STORE_KEY = 'scm_times';

const PRAYERS = [
  { id: 'fajr',    name: 'Fajr',    arabic: 'ٱلْفَجْر',     time: '5:14 AM',  note: 'Dawn' },
  { id: 'dhuhr',   name: 'Dhuhr',   arabic: 'ٱلظُّهْر',      time: '12:48 PM', note: "Midday · becomes Jumu'ah on Fri" },
  { id: 'asr',     name: 'Asr',     arabic: 'ٱلْعَصْر',      time: '4:10 PM',  note: 'Afternoon' },
  { id: 'maghrib', name: 'Maghrib', arabic: 'ٱلْمَغْرِب',    time: '6:32 PM',  note: 'Sunset' },
  { id: 'isha',    name: 'Isha',    arabic: 'ٱلْعِشَاء',     time: '7:48 PM',  note: 'Night' }
];

function buildDefaults() {
  const o = {};
  PRAYERS.forEach(p => { o[p.id] = p.time; });
  o.jumuah = '1:15 PM';
  o.khutbah = '1:00 PM';
  return o;
}

function loadTimes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) return saved;
  } catch (e) { /* fall through */ }
  return buildDefaults();
}

let times = loadTimes();

function saveTimes() {
  localStorage.setItem(STORE_KEY, JSON.stringify(times));
}

// ── Server sync ──

/**
 * Fetch prayer times from the server and merge into localStorage.
 * Call once on app startup to sync with admin changes.
 */
export async function init() {
  try {
    const res = await fetch('/api/times');
    if (res.ok) {
      const serverTimes = await res.json();
      // Merge server times into local state
      Object.assign(times, serverTimes);
      saveTimes();
    }
  } catch (e) {
    // Offline — use cached localStorage times
  }
}

// ── Public interface ──

export function getPrayers() {
  return PRAYERS;
}

export function getTime(id) {
  return times[id];
}

export async function setTime(id, timeStr) {
  times[id] = timeStr;
  saveTimes();

  // Sync to server so other devices get the update
  try {
    await fetch('/api/times/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: timeStr })
    });
  } catch (e) {
    // Server may be unreachable — times still saved locally
  }
}

export function to24(str) {
  const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let h = +m[1];
  const mm = +m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return { h, m: mm };
}

export function to12(h, m) {
  const ap = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
}

export function nextPrayerSlot() {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let best = null;
  let bestDist = Infinity;

  PRAYERS.forEach(p => {
    const t = to24(times[p.id]);
    const mins = t.h * 60 + t.m;
    let dist = mins - cur;
    if (dist < 0) dist += 1440;
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  });

  return best;
}
