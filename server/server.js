/**
 * SEMRA server — API, web push, and static surfaces.
 *
 * Surfaces:
 *   /        → landing/
 *   /app/    → pwa/
 *   /admin/  → admin/
 *   /shared/ → shared/
 *   /media/  → data/media/ (academy gallery photo files)
 *
 * Modules:
 *   store.js — JSON persistence, seeds, record mapping
 *   push.js  — web-push setup, shared send routine, expired pruning
 *   adhan-reminders.js — pure scheduling logic
 *
 * Usage: node server/server.js
 */

import express from 'express';
import { join, dirname } from 'path';
import { unlinkSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { normalizeSettings } from '../shared/notification-settings.js';
import {
  collectDueReminders,
  pruneSentLog,
} from './adhan-reminders.js';
import {
  toSubscriberRecord,
  readSubscribers,
  writeSubscribers,
  readAnnouncements,
  writeAnnouncements,
  readEvents,
  writeEvents,
  sortEvents,
  normalizeEvent,
  readAcademy,
  writeAcademy,
  normalizeAcademy,
  readTimes,
  writeTimes,
  readSentLog,
  writeSentLog,
  MEDIA_DIR,
  decodeImageUpload,
  normalizeYouTubeUrl,
  addAcademyPhoto,
  addAcademyVideo,
  removeGalleryItem,
} from './store.js';
import {
  pushAll,
  sendMany,
  pruneExpired,
  describePushError,
} from './push.js';
import { getLatestVideos } from './videos.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ADHAN_TICK_MS = 30_000;

// ── Express app ──

const app = express();
app.use(express.json());

// Static surfaces (order matters: more specific mounts first)
app.use('/app', express.static(join(ROOT, 'pwa')));
app.use('/admin', express.static(join(ROOT, 'admin')));
app.use('/shared', express.static(join(ROOT, 'shared')));
app.use('/media', express.static(MEDIA_DIR));
app.use(express.static(join(ROOT, 'landing')));

/**
 * Accept POST body as either:
 *   { subscription, settings }
 *   or a bare PushSubscriptionJSON (legacy).
 */
function extractSubscription(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.subscription && body.subscription.endpoint) {
    return {
      push: body.subscription,
      settings: body.settings,
    };
  }
  if (body.endpoint) {
    const { settings, ...push } = body;
    return { push, settings };
  }
  return null;
}

// ── API: Subscriber register / refresh ──

app.post('/api/subscribe', (req, res) => {
  const extracted = extractSubscription(req.body);
  if (!extracted?.push?.endpoint || !extracted.push.keys) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }

  const record = toSubscriberRecord(extracted.push, extracted.settings);
  const subs = readSubscribers();
  const index = subs.findIndex((s) => s.endpoint === record.endpoint);
  if (index >= 0) {
    // Refresh keys if rotated; always take latest settings when provided
    subs[index] = {
      ...record,
      settings:
        extracted.settings !== undefined
          ? record.settings
          : subs[index].settings,
    };
  } else {
    subs.push(record);
  }
  writeSubscribers(subs);

  console.log(`🔔 Subscriber upserted (${subs.length} total)`);
  res.json({ ok: true, count: subs.length });
});

// ── API: patch Notification settings for an existing Subscriber ──

app.patch('/api/subscribe', (req, res) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({ error: 'endpoint is required' });
  }
  if (req.body.settings === undefined) {
    return res.status(400).json({ error: 'settings are required' });
  }

  const subs = readSubscribers();
  const index = subs.findIndex((s) => s.endpoint === endpoint);
  if (index < 0) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  subs[index] = {
    ...subs[index],
    settings: normalizeSettings(req.body.settings),
  };
  writeSubscribers(subs);

  console.log(`⚙️  Notification settings updated`);
  res.json({ ok: true, settings: subs[index].settings });
});

// ── API: get / update Academy details (shown on /academy.html) ──

app.get('/api/academy', (_req, res) => {
  res.json(readAcademy());
});

app.put('/api/academy', (req, res) => {
  const result = normalizeAcademy(req.body, readAcademy());
  if (result.error) return res.status(400).json({ error: result.error });

  writeAcademy(result.academy);
  console.log(`📚 Academy updated: ${result.academy.term} · ${result.academy.session}`);
  res.json({ ok: true, academy: result.academy });
});

// ── API: Academy gallery (photos stored on the server, videos linked to YouTube) ──

app.post('/api/academy/gallery/photos', (req, res) => {
  const decoded = decodeImageUpload(req.body);
  if (decoded.error) return res.status(400).json({ error: decoded.error });

  try {
    writeFileSync(join(MEDIA_DIR, decoded.fileName), decoded.file);
  } catch (err) {
    return res.status(500).json({ error: 'Could not store image' });
  }

  const photo = addAcademyPhoto({
    file: decoded.fileName,
    caption: req.body?.caption,
    date: req.body?.date
  });
  console.log(`🖼️  Academy photo added: ${decoded.fileName}`);
  res.status(201).json({ ok: true, photo });
});

app.post('/api/academy/gallery/videos', (req, res) => {
  const result = normalizeYouTubeUrl(req.body?.url);
  if (result.error) return res.status(400).json({ error: result.error });

  const video = addAcademyVideo({
    url: result.url,
    caption: req.body?.caption,
    date: req.body?.date
  });
  console.log(`🎬 Academy video added: ${result.videoId}`);
  res.status(201).json({ ok: true, video });
});

app.delete('/api/academy/gallery/:kind/:id', (req, res) => {
  const { kind, id } = req.params;
  if (kind !== 'photo' && kind !== 'video') {
    return res.status(400).json({ error: 'kind must be photo or video' });
  }

  const removed = removeGalleryItem(kind, id);
  if (!removed) return res.status(404).json({ error: 'Not found' });

  if (kind === 'photo') {
    try { unlinkSync(join(MEDIA_DIR, removed.file)); } catch { /* file may already be gone */ }
  }
  console.log(`🗑️  Academy gallery ${kind} removed: ${id}`);
  res.json({ ok: true });
});

// ── API: latest video from the SEMRA YouTube channel (ADR 0005) ──

app.get('/api/videos', async (_req, res) => {
  try {
    res.json(await getLatestVideos());
  } catch (err) {
    console.warn(`🎬 YouTube feed fetch failed: ${err.message}`);
    res.status(502).json({ error: 'Could not reach YouTube right now' });
  }
});

// ── API: get announcements ──

app.get('/api/announcements', (_req, res) => {
  res.json(readAnnouncements());
});

// ── API: admin sends notification ──

app.post('/api/notify', async (req, res) => {
  const { type, tag, title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  const announcements = readAnnouncements();
  announcements.unshift({
    type: type || 'gn',
    title,
    body,
    tag: tag || 'General',
    when: 'just now',
    ts: Date.now()
  });
  writeAnnouncements(announcements);

  // Committee message — honour news toggle (ADR 0004)
  const result = await pushAll(
    { title, body, type: 'committee' },
    { predicate: (s) => s.settings.news },
  );
  res.json({ ok: true, ...result, total: readSubscribers().length });
});

// ── API: admin deletes announcement ──

app.delete('/api/announcements/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const announcements = readAnnouncements();
  if (index >= 0 && index < announcements.length) {
    announcements.splice(index, 1);
    writeAnnouncements(announcements);
    return res.json({ ok: true });
  }
  res.status(404).json({ error: 'Not found' });
});

// ── Events (calendar programmes — separate from Announcements) ──

app.get('/api/events', (_req, res) => {
  res.json(sortEvents(readEvents()));
});

app.get('/api/events/:id', (req, res) => {
  const event = readEvents().find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  res.json(event);
});

app.post('/api/events', async (req, res) => {
  const result = normalizeEvent(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const events = readEvents();
  events.push(result.event);
  writeEvents(events);
  console.log(`📅 Event created: ${result.event.title}`);

  let push = null;
  if (req.body.notify) {
    push = await pushAll(
      {
        title: 'New event: ' + result.event.title,
        body: `${result.event.date} · ${result.event.time} · ${result.event.location}`,
        url: '/events.html',
        type: 'committee',
      },
      { predicate: (s) => s.settings.news },
    );
  }

  res.status(201).json({ ok: true, event: result.event, push });
});

app.put('/api/events/:id', async (req, res) => {
  const events = readEvents();
  const index = events.findIndex((e) => e.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Not found' });

  const result = normalizeEvent(req.body, events[index]);
  if (result.error) return res.status(400).json({ error: result.error });

  events[index] = result.event;
  writeEvents(events);
  console.log(`📅 Event updated: ${result.event.title}`);

  let push = null;
  if (req.body.notify) {
    push = await pushAll(
      {
        title: 'Event updated: ' + result.event.title,
        body: `${result.event.date} · ${result.event.time} · ${result.event.location}`,
        url: '/events.html',
        type: 'committee',
      },
      { predicate: (s) => s.settings.news },
    );
  }

  res.json({ ok: true, event: result.event, push });
});

app.delete('/api/events/:id', (req, res) => {
  const events = readEvents();
  const index = events.findIndex((e) => e.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Not found' });
  const [removed] = events.splice(index, 1);
  writeEvents(events);
  console.log(`📅 Event deleted: ${removed.title}`);
  res.json({ ok: true });
});

// ── Prayer times ──

app.get('/api/times', (_req, res) => {
  res.json(readTimes());
});

app.post('/api/times/:id', async (req, res) => {
  const { id } = req.params;
  const { time } = req.body;
  if (!id || !time) {
    return res.status(400).json({ error: 'id and time are required' });
  }
  const times = readTimes();
  times[id] = time;
  writeTimes(times);
  console.log(`🕐 ${id} → ${time}`);

  // Schedule update — always all Subscribers (ADR 0002 / 0004)
  const label = id.charAt(0).toUpperCase() + id.slice(1);
  await pushAll({
    title: 'Prayer times updated',
    body: `${label} is now ${time}`,
    url: '/app/',
    type: 'schedule',
  });

  res.json({ ok: true, times });
});

// ── Adhan / Jumu'ah reminder clock (ADR 0004) ──

let adhanTickRunning = false;

async function tickAdhanReminders() {
  if (adhanTickRunning) return;
  adhanTickRunning = true;
  try {
    const now = new Date();
    let sentLog = pruneSentLog(readSentLog(), now);
    const times = readTimes();
    const subscribers = readSubscribers();
    const due = collectDueReminders({ now, times, subscribers, sentLog });

    if (due.length === 0) {
      writeSentLog(sentLog);
      return;
    }

    // Mark keys before send to avoid double-fire if a tick overlaps
    for (const item of due) {
      sentLog[item.reminder.sentKey] = true;
    }
    writeSentLog(sentLog);

    // Parallel sends — a transient failure on one Subscriber never aborts
    // the batch (and can't lose the rest of the day's reminders).
    const { results, expired } = await sendMany(
      due.map((item) => ({
        sub: item.subscriber,
        payload: {
          title: item.reminder.title,
          body: item.reminder.body,
          url: '/app/',
          type: 'adhan',
        },
      })),
    );

    results.forEach((r, i) => {
      const item = due[i];
      if (r.status === 'rejected') {
        console.warn(
          `Adhan push failed (${item.reminder.id}): ${describePushError(r.reason)} — ${item.endpoint.slice(0, 64)}…`,
        );
      } else if (!r.value?.expired) {
        console.log(`🕌 Adhan push: ${item.reminder.id} → ${item.endpoint.slice(0, 48)}…`);
      }
    });

    pruneExpired(expired);
  } catch (err) {
    console.error('Adhan tick error:', err);
  } finally {
    adhanTickRunning = false;
  }
}

// ── Start ──

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  const subs = readSubscribers().length;
  console.log(`🕌 SEMRA server running on http://localhost:${PORT}`);
  console.log(`   Landing  http://localhost:${PORT}/`);
  console.log(`   PWA      http://localhost:${PORT}/app/`);
  console.log(`   Admin    http://localhost:${PORT}/admin/`);
  console.log(`🔔 ${subs} Subscribers`);
  console.log(`⏰ Adhan reminder clock every ${ADHAN_TICK_MS / 1000}s (Africa/Lagos)`);
  tickAdhanReminders();
  setInterval(tickAdhanReminders, ADHAN_TICK_MS);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Find the culprit with:`);
    console.error(`   lsof -nP -iTCP:${PORT} -sTCP:LISTEN`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

server.on('close', () => {
  console.error('⚠️  Server closed unexpectedly');
});
