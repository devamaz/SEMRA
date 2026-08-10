/**
 * Tests for times-data.js
 * Run with: node --test tests/times-data.test.js
 *
 * Note: localStorage is mocked globally before the dynamic import.
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

// Dynamic import so the mock is in place before the module loads
let TimesData;
before(async () => {
  TimesData = await import('../shared/times-data.js');
});

after(() => {
  delete globalThis.localStorage;
});

// ── to24 ──

describe('to24()', () => {
  it('converts morning AM', () => {
    assert.deepStrictEqual(TimesData.to24('5:14 AM'), { h: 5, m: 14 });
  });

  it('converts afternoon PM', () => {
    assert.deepStrictEqual(TimesData.to24('12:48 PM'), { h: 12, m: 48 });
  });

  it('converts midnight (12 AM → hour 0)', () => {
    assert.deepStrictEqual(TimesData.to24('12:00 AM'), { h: 0, m: 0 });
  });

  it('converts last minute of day (11:59 PM → 23:59)', () => {
    assert.deepStrictEqual(TimesData.to24('11:59 PM'), { h: 23, m: 59 });
  });

  it('handles no space before AM/PM', () => {
    assert.deepStrictEqual(TimesData.to24('6:32PM'), { h: 18, m: 32 });
  });

  it('is case-insensitive', () => {
    assert.deepStrictEqual(TimesData.to24('5:14 am'), { h: 5, m: 14 });
  });
});

// ── to12 ──

describe('to12()', () => {
  it('converts morning hours', () => {
    assert.strictEqual(TimesData.to12(5, 14), '5:14 AM');
  });

  it('converts noon', () => {
    assert.strictEqual(TimesData.to12(12, 48), '12:48 PM');
  });

  it('converts midnight', () => {
    assert.strictEqual(TimesData.to12(0, 0), '12:00 AM');
  });

  it('converts evening', () => {
    assert.strictEqual(TimesData.to12(23, 59), '11:59 PM');
  });

  it('zero-pads single-digit minutes', () => {
    assert.strictEqual(TimesData.to12(5, 5), '5:05 AM');
  });

  it('does not zero-pad double-digit minutes', () => {
    assert.strictEqual(TimesData.to12(5, 30), '5:30 AM');
  });
});

// ── getPrayers ──

describe('getPrayers()', () => {
  it('returns array of 5 prayers', () => {
    const prayers = TimesData.getPrayers();
    assert.strictEqual(prayers.length, 5);
  });

  it('each prayer has id, name, arabic, time, note', () => {
    const prayers = TimesData.getPrayers();
    prayers.forEach(p => {
      assert.ok(p.id);
      assert.ok(p.name);
      assert.ok(p.arabic);
      assert.ok(p.time);
      assert.ok(p.note !== undefined);
    });
  });

  it('prayer ids are fajr, dhuhr, asr, maghrib, isha', () => {
    const ids = TimesData.getPrayers().map(p => p.id);
    assert.deepStrictEqual(ids, ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
  });
});

// ── getTime / setTime ──

describe('getTime() / setTime()', () => {
  it('returns the correct default time for fajr', () => {
    assert.strictEqual(TimesData.getTime('fajr'), '5:14 AM');
  });

  it('returns jumuah default', () => {
    assert.strictEqual(TimesData.getTime('jumuah'), '1:15 PM');
  });

  it('returns khutbah default', () => {
    assert.strictEqual(TimesData.getTime('khutbah'), '1:00 PM');
  });

  it('setTime updates the time and persists', () => {
    TimesData.setTime('fajr', '5:30 AM');
    assert.strictEqual(TimesData.getTime('fajr'), '5:30 AM');

    // Verify persistence by checking localStorage directly
    const stored = JSON.parse(globalThis.localStorage.getItem('scm_times'));
    assert.strictEqual(stored.fajr, '5:30 AM');
  });

  it('setTime on jumuah works', () => {
    TimesData.setTime('jumuah', '2:00 PM');
    assert.strictEqual(TimesData.getTime('jumuah'), '2:00 PM');
  });
});

// ── nextPrayerSlot ──

describe('nextPrayerSlot()', () => {
  it('returns a prayer with id, name, arabic', () => {
    const next = TimesData.nextPrayerSlot();
    assert.ok(next);
    assert.ok(next.id);
    assert.ok(next.name);
    assert.ok(next.arabic);
  });

  it('always returns one of the five prayers', () => {
    const next = TimesData.nextPrayerSlot();
    const ids = TimesData.getPrayers().map(p => p.id);
    assert.ok(ids.includes(next.id));
  });
});
