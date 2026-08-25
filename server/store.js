/**
 * store — JSON persistence, seeds, and record mapping for SEMRA server data.
 *
 * All server-side disk I/O lives here so the HTTP layer (server.js) never
 * has to know how records are serialized to disk.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeSettings } from '../shared/notification-settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');

export const MEDIA_DIR = join(DATA_DIR, 'media');
export const MEDIA_URL = '/media';

const SUBS_FILE = join(DATA_DIR, 'subscriptions.json');
const SENT_LOG_FILE = join(DATA_DIR, 'adhan-sent.json');
const ANNOUNCEMENTS_FILE = join(DATA_DIR, 'announcements.json');
const EVENTS_FILE = join(DATA_DIR, 'events.json');
const TIMES_FILE = join(DATA_DIR, 'times.json');
const ACADEMY_FILE = join(DATA_DIR, 'academy.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(MEDIA_DIR)) mkdirSync(MEDIA_DIR, { recursive: true });

// ── Generic JSON ──

function readJSON(path, fallback) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) { /* use fallback */ }
  return fallback;
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// ── Subscribers (push endpoint + Notification settings) ──

/**
 * Map a parsed push subscription + settings to a stored Subscriber record.
 */
export function toSubscriberRecord(push, settings) {
  return {
    endpoint: push.endpoint,
    expirationTime: push.expirationTime ?? null,
    keys: push.keys,
    settings: normalizeSettings(settings),
  };
}

export function readSubscribers() {
  const raw = readJSON(SUBS_FILE, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && row.endpoint && row.keys)
    .map((row) => ({
      endpoint: row.endpoint,
      expirationTime: row.expirationTime ?? null,
      keys: row.keys,
      settings: normalizeSettings(row.settings),
    }));
}

export function writeSubscribers(subs) {
  writeJSON(SUBS_FILE, subs);
}

// ── Announcements ──

const SEED_ANNOUNCEMENTS = [
  { type: 'event', title: 'Eid ul-Adha arrangements', body: 'Eid prayer at 7:00 AM on the estate grounds. Please arrive by 6:30 AM. Qurbani collection open until Thursday.', tag: 'Eid', when: '2 days ago' },
  { type: 'gn',     title: 'Water supply at the masjid', body: 'New wudhu taps installed. Please keep the area dry and report leaks to the committee.', tag: 'Facility', when: '5 days ago' },
  { type: 'event',  title: 'Tafsir circle every Thursday', body: 'Weekly Tafsir after Maghrib, led by Ustadh Musa. All residents welcome.', tag: 'Programme', when: '1 week ago' }
];

export function readAnnouncements() {
  const announcements = readJSON(ANNOUNCEMENTS_FILE, SEED_ANNOUNCEMENTS);
  return Array.isArray(announcements) ? announcements : SEED_ANNOUNCEMENTS;
}

export function writeAnnouncements(announcements) {
  writeJSON(ANNOUNCEMENTS_FILE, announcements);
}

// ── Events (calendar programmes — separate from Announcements) ──

const SEED_EVENTS = [
  {
    id: 'evt-eid-2026',
    title: 'Eid Prayer & Community Feast',
    description: 'Open Eid prayer at dawn, followed by a shared meal and children\'s activities on the mosque grounds.',
    tag: 'Eid al-Adḥā',
    date: '2026-06-17',
    time: '6:30 AM',
    location: 'Mosque grounds',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 'evt-tafsir-weekly',
    title: 'Weekly Tafsīr Circle',
    description: 'A verse-by-verse reading after Maghrib, led by our resident teacher. Open to men and women, all ages.',
    tag: 'Halaqah',
    date: '2026-04-03',
    time: 'After Maghrib',
    location: 'Main hall',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z'
  },
  {
    id: 'evt-academy-term',
    title: 'Islamiyyah Term Resumes',
    description: 'New term begins for the children\'s academy. Enrolment is open — Qurʾan, Tajwīd, and Islamic studies.',
    tag: 'Academy',
    date: '2026-08-15',
    time: '9:00 AM',
    location: 'Academy hall',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z'
  }
];

export function readEvents() {
  const events = readJSON(EVENTS_FILE, SEED_EVENTS);
  return Array.isArray(events) ? events : SEED_EVENTS;
}

export function writeEvents(events) {
  writeJSON(EVENTS_FILE, events);
}

export function sortEvents(events) {
  return [...events].sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date));
    if (byDate !== 0) return byDate;
    return String(a.time).localeCompare(String(b.time));
  });
}

export function normalizeEvent(body, existing = null) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const tag = String(body.tag || 'General').trim() || 'General';
  const date = String(body.date || '').trim();
  const time = String(body.time || '').trim();
  const location = String(body.location || '').trim();

  if (!title || !description || !date || !time || !location) {
    return { error: 'title, description, date, time, and location are required' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'date must be YYYY-MM-DD' };
  }

  const now = new Date().toISOString();
  return {
    event: {
      id: existing?.id || crypto.randomUUID(),
      title,
      description,
      tag,
      date,
      time,
      location,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    }
  };
}

// ── Academy (public Islamiyyah academy details) ──

const SEED_ACADEMY = {
  session: '2026/2027',
  term: '1st term',
  termStart: '12th of September',
  gallery: {
    photos: [],
    videos: []
  },
  classes: [
    {
      id: 'acad-children-weekend',
      label: 'Children — Saturdays & Sundays',
      days: 'Saturdays & Sundays',
      time: '9:00 AM – 1:00 PM',
      form: 'islamiyya form universal.pdf'
    },
    {
      id: 'acad-children-after-school',
      label: 'Children — Monday to Wednesday',
      days: 'Monday – Wednesday',
      time: '4:00 PM – 6:00 PM',
      form: 'islamiyya form universal.pdf'
    },
    {
      id: 'acad-female-adults',
      label: 'Female Adults',
      days: 'Saturdays & Sundays',
      time: '4:00 PM – 6:00 PM',
      form: 'islamiyya form Adult.pdf'
    }
  ]
};

const DEFAULT_FORM = 'islamiyya form universal.pdf';

/** Registration form for a class row: explicit value wins, else by label. */
function classForm(row) {
  const explicit = String(row.form ?? '').trim();
  if (explicit) return explicit;
  const hint = String(row.label ?? row.id ?? '');
  return /adult/i.test(hint) ? 'islamiyya form Adult.pdf' : DEFAULT_FORM;
}

// ── Academy gallery (photos stored on the server, videos linked to YouTube) ──

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Normalize a gallery payload into photos/videos lists.
 * Drops records that don't carry their identity (id + file for photos,
 * id + url for videos); everything else passes through as strings.
 */
function parseGallery(raw) {
  const photos = Array.isArray(raw?.photos) ? raw.photos : [];
  const videos = Array.isArray(raw?.videos) ? raw.videos : [];
  return {
    photos: photos
      .filter((p) => p && typeof p === 'object' && p.id && p.file)
      .map((p) => ({
        id: String(p.id),
        file: String(p.file),
        caption: String(p.caption ?? ''),
        date: String(p.date ?? ''),
        addedAt: String(p.addedAt ?? '')
      })),
    videos: videos
      .filter((v) => v && typeof v === 'object' && v.id && v.url)
      .map((v) => ({
        id: String(v.id),
        url: String(v.url),
        caption: String(v.caption ?? ''),
        date: String(v.date ?? ''),
        addedAt: String(v.addedAt ?? '')
      }))
  };
}

/**
 * Canonicalize a YouTube link to `https://www.youtube.com/watch?v={id}`.
 * Accepts watch, youtu.be, shorts, embed, and live forms. Pure — unit-tested.
 */
const YT_ID_RE = /(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;

export function normalizeYouTubeUrl(raw) {
  const input = String(raw ?? '').trim();
  const match = input.match(YT_ID_RE);
  if (!match) return { error: 'url must be a YouTube video link' };
  const videoId = match[1];
  return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
}

/**
 * Validate + decode a base64 image upload from the admin.
 * Returns { file: Buffer, fileName, ext } or { error }. Pure — unit-tested.
 */
export function decodeImageUpload(body) {
  const source = body && typeof body === 'object' ? body : {};
  const ext = IMAGE_TYPES[String(source.type ?? '')];
  if (!ext) return { error: 'unsupported image type — use jpeg, png, webp, or gif' };

  const raw = String(source.data ?? '').trim();
  if (!raw) return { error: 'image data is required' };
  const b64 = raw.startsWith('data:') ? raw.slice(raw.indexOf(',') + 1) : raw;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return { error: 'invalid image data' };

  const file = Buffer.from(b64.replace(/\s/g, ''), 'base64');
  if (file.length === 0) return { error: 'empty image' };
  if (file.length > MAX_PHOTO_BYTES) {
    return { error: `image must be under ${Math.floor(MAX_PHOTO_BYTES / 1024 / 1024)} MB` };
  }
  return { file, ext, fileName: `${crypto.randomUUID()}.${ext}` };
}

/** Append an Academy photo (file already written to MEDIA_DIR) — newest first. */
export function addAcademyPhoto({ file, caption, date }) {
  const academy = readAcademy();
  academy.gallery.photos.unshift({
    id: crypto.randomUUID(),
    file,
    caption: String(caption ?? '').trim(),
    date: String(date ?? '').trim(),
    addedAt: new Date().toISOString()
  });
  writeAcademy(academy);
  return academy.gallery.photos[0];
}

/** Append an Academy video (YouTube link only — never a file) — newest first. */
export function addAcademyVideo({ url, caption, date }) {
  const academy = readAcademy();
  academy.gallery.videos.unshift({
    id: crypto.randomUUID(),
    url,
    caption: String(caption ?? '').trim(),
    date: String(date ?? '').trim(),
    addedAt: new Date().toISOString()
  });
  writeAcademy(academy);
  return academy.gallery.videos[0];
}

/** Remove a gallery item (photo or video) by id; returns the removed record or null. */
export function removeGalleryItem(kind, id) {
  if (kind !== 'photo' && kind !== 'video') return null;
  const academy = readAcademy();
  const list = kind === 'photo' ? academy.gallery.photos : academy.gallery.videos;
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const [removed] = list.splice(index, 1);
  writeAcademy(academy);
  return removed;
}

export function readAcademy() {
  const academy = readJSON(ACADEMY_FILE, SEED_ACADEMY);
  if (!academy || typeof academy !== 'object') return structuredClone(SEED_ACADEMY);
  return {
    session: String(academy.session ?? ''),
    term: String(academy.term ?? ''),
    termStart: String(academy.termStart ?? ''),
    gallery: parseGallery(academy.gallery),
    classes: Array.isArray(academy.classes)
      ? academy.classes
          .filter((row) => row && typeof row === 'object')
          .map((row) => ({
            id: row.id,
            label: String(row.label ?? ''),
            days: String(row.days ?? ''),
            time: String(row.time ?? ''),
            form: classForm(row)
          }))
      : []
  };
}

export function writeAcademy(academy) {
  writeJSON(ACADEMY_FILE, academy);
}

/**
 * Normalize an admin-submitted Academy payload.
 * Every class row must carry days and time; label defaults to 'Class'.
 */
export function normalizeAcademy(body, existing = null) {
  const source = body && typeof body === 'object' ? body : {};
  const session = String(source.session ?? '').trim();
  const term = String(source.term ?? '').trim();
  const termStart = String(source.termStart ?? '').trim();

  const rawClasses = Array.isArray(source.classes) ? source.classes : [];
  const classes = rawClasses
    .filter((row) => row && typeof row === 'object')
    .map((row, i) => ({
      id:
        existing?.classes?.[i]?.id ||
        row.id ||
        crypto.randomUUID(),
      label: String(row.label ?? '').trim() || 'Class',
      days: String(row.days ?? '').trim(),
      time: String(row.time ?? '').trim(),
      form: String(row.form ?? '').trim() || existing?.classes?.[i]?.form || classForm(row)
    }));

  if (!session || !term || !termStart) {
    return { error: 'session, term, and termStart are required' };
  }
  if (classes.length === 0 || classes.some((c) => !c.days || !c.time)) {
    return { error: 'at least one class with days and time is required' };
  }

  return {
    academy: {
      session,
      term,
      termStart,
      gallery: parseGallery(source.gallery ?? existing?.gallery),
      classes
    }
  };
}

// ── Prayer times ──

const DEFAULT_TIMES = {
  fajr: '5:14 AM',
  dhuhr: '12:48 PM',
  asr: '4:10 PM',
  maghrib: '6:32 PM',
  isha: '7:48 PM',
  jumuah: '1:15 PM',
  khutbah: '1:00 PM'
};

export function readTimes() {
  return readJSON(TIMES_FILE, DEFAULT_TIMES);
}

export function writeTimes(times) {
  writeJSON(TIMES_FILE, times);
}

// ── Adhan sent log ──

export function readSentLog() {
  return readJSON(SENT_LOG_FILE, {});
}

export function writeSentLog(sentLog) {
  writeJSON(SENT_LOG_FILE, sentLog);
}
