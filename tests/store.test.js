/**
 * Tests for store.js — pure record mapping and event normalization.
 *
 * File-I/O paths (the read/write accessors) are intentionally not covered
 * here: they touch the live data/ directory and would corrupt state if
 * pointed at it.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toSubscriberRecord,
  normalizeEvent,
  sortEvents,
} from '../server/store.js';

describe('toSubscriberRecord', () => {
  it('fills expirationTime and normalizes settings', () => {
    const rec = toSubscriberRecord(
      { endpoint: 'https://push.test/s/1', expirationTime: null, keys: { p256dh: 'k' } },
      { remind: 15, notif: { fajr: false } },
    );
    assert.equal(rec.endpoint, 'https://push.test/s/1');
    assert.equal(rec.expirationTime, null);
    assert.deepEqual(rec.keys, { p256dh: 'k' });
    assert.equal(rec.settings.remind, 15);
    assert.equal(rec.settings.notif.fajr, false);
    assert.equal(rec.settings.notif.maghrib, true); // untouched prefs keep defaults
  });
});

describe('normalizeEvent', () => {
  const valid = {
    title: 'Tafsir',
    description: 'Weekly circle',
    tag: 'Halaqah',
    date: '2026-04-03',
    time: 'After Maghrib',
    location: 'Main hall',
  };

  it('rejects missing required fields', () => {
    assert.ok(normalizeEvent({ title: 'only title' }).error);
    assert.ok(normalizeEvent({}).error);
  });

  it('rejects non ISO dates', () => {
    assert.match(normalizeEvent({ ...valid, date: '03/04/2026' }).error, /YYYY-MM-DD/);
  });

  it('accepts a valid event and defaults the tag', () => {
    const { event } = normalizeEvent({ ...valid, tag: '' });
    assert.equal(event.tag, 'General');
    assert.ok(event.id);
    assert.equal(event.createdAt, event.updatedAt);
  });

  it('preserves id and createdAt when updating, bumps updatedAt', () => {
    const existing = {
      id: 'evt-1',
      title: 'Old',
      description: 'Old desc',
      tag: 'Halaqah',
      date: '2026-04-03',
      time: 'After Maghrib',
      location: 'Main hall',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    };
    const { event } = normalizeEvent({ ...valid, title: 'New title' }, existing);
    assert.equal(event.id, 'evt-1');
    assert.equal(event.createdAt, '2026-03-01T10:00:00.000Z');
    assert.equal(event.title, 'New title');
    assert.ok(event.updatedAt > existing.updatedAt);
  });
});

describe('sortEvents', () => {
  it('sorts by date then time without mutating input', () => {
    const events = [
      { id: 'b', date: '2026-05-01', time: '9:00 AM' },
      { id: 'a', date: '2026-03-01', time: '6:30 AM' },
      { id: 'c', date: '2026-05-01', time: '7:00 PM' },
    ];
    // Same-date rows order by lexical time string (e.g. "7:00 PM" < "9:00 AM").
    assert.deepEqual(sortEvents(events).map((e) => e.id), ['a', 'c', 'b']);
    assert.deepEqual(events.map((e) => e.id), ['b', 'a', 'c']); // input untouched
  });
});
