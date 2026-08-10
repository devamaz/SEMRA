/**
 * Tests for state.js
 * Run with: node --test tests/state.test.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage mock ──

let store = {};
globalThis.localStorage = {
  getItem(key) { return store[key] ?? null; },
  setItem(key, value) { store[key] = String(value); },
  removeItem(key) { delete store[key]; },
  clear() { store = {}; }
};

let State;
before(async () => {
  State = await import('../shared/state.js');
});

after(() => {
  delete globalThis.localStorage;
});

// ── getSettings ──

describe('getSettings()', () => {
  it('returns default settings with all prayer notifs enabled', () => {
    const s = State.getSettings();
    assert.strictEqual(s.notif.fajr, true);
    assert.strictEqual(s.notif.dhuhr, true);
    assert.strictEqual(s.notif.asr, true);
    assert.strictEqual(s.notif.maghrib, true);
    assert.strictEqual(s.notif.isha, true);
  });

  it('default reminder offset is 5', () => {
    const s = State.getSettings();
    assert.strictEqual(s.remind, 5);
  });

  it('default jumuah and news are enabled', () => {
    const s = State.getSettings();
    assert.strictEqual(s.jumuah, true);
    assert.strictEqual(s.news, true);
  });
});

// ── subscribe / notify ──

describe('subscribe() / notify', () => {
  it('calls subscriber when a setting changes', () => {
    let called = false;
    let receivedSettings = null;
    const unsub = State.subscribe((s) => {
      called = true;
      receivedSettings = s;
    });

    State.togglePrayerNotif('fajr');

    assert.strictEqual(called, true);
    assert.ok(receivedSettings);
    unsub();
  });

  it('returns an unsubscribe function that stops notifications', () => {
    let callCount = 0;
    const unsub = State.subscribe(() => { callCount++; });

    State.togglePrayerNotif('dhuhr');
    assert.strictEqual(callCount, 1);

    unsub();
    State.togglePrayerNotif('dhuhr');
    assert.strictEqual(callCount, 1); // no second call
  });

  it('notifies all subscribers', () => {
    let count1 = 0, count2 = 0;
    const u1 = State.subscribe(() => { count1++; });
    const u2 = State.subscribe(() => { count2++; });

    State.toggleJumuah();

    assert.strictEqual(count1, 1);
    assert.strictEqual(count2, 1);

    u1();
    u2();
  });
});

// ── togglePrayerNotif ──

describe('togglePrayerNotif()', () => {
  it('toggles a prayer notification off then on', () => {
    const before = State.getSettings().notif.asr;
    State.togglePrayerNotif('asr');
    const after = State.getSettings().notif.asr;
    assert.strictEqual(after, !before);

    State.togglePrayerNotif('asr');
    assert.strictEqual(State.getSettings().notif.asr, before);
  });
});

// ── setReminderOffset ──

describe('setReminderOffset()', () => {
  it('changes the reminder offset', () => {
    State.setReminderOffset(10);
    assert.strictEqual(State.getSettings().remind, 10);
  });

  it('accepts 0 (on time)', () => {
    State.setReminderOffset(0);
    assert.strictEqual(State.getSettings().remind, 0);
  });
});

// ── toggleJumuah / toggleNews ──

describe('toggleJumuah()', () => {
  it('toggles the jumuah reminder setting', () => {
    const before = State.getSettings().jumuah;
    State.toggleJumuah();
    assert.strictEqual(State.getSettings().jumuah, !before);
  });
});

describe('toggleNews()', () => {
  it('toggles the news setting', () => {
    const before = State.getSettings().news;
    State.toggleNews();
    assert.strictEqual(State.getSettings().news, !before);
  });
});
