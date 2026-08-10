import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTime12,
  subtractMinutes,
  isWithinFreshness,
  mosqueWallToUtcMs,
  getMosqueParts,
  dueRemindersForSubscriber,
  collectDueReminders,
  pruneSentLog,
  FRESHNESS_MS,
  MOSQUE_TZ,
} from '../server/adhan-reminders.js';
import { normalizeSettings, DEFAULT_NOTIFICATION_SETTINGS } from '../shared/notification-settings.js';

const TIMES = {
  fajr: '5:14 AM',
  dhuhr: '12:48 PM',
  asr: '4:10 PM',
  maghrib: '6:32 PM',
  isha: '7:48 PM',
  jumuah: '1:15 PM',
  khutbah: '1:00 PM',
};

/** Build a Date whose mosque-local wall time matches the args. */
function atLagos(year, month, day, hour, minute, second = 0) {
  const ms = mosqueWallToUtcMs(year, month, day, hour, minute, second, MOSQUE_TZ);
  return new Date(ms);
}

describe('parseTime12 / subtractMinutes', () => {
  it('parses 12h times', () => {
    assert.deepEqual(parseTime12('6:32 PM'), { h: 18, m: 32 });
    assert.deepEqual(parseTime12('12:48 PM'), { h: 12, m: 48 });
    assert.deepEqual(parseTime12('5:14 AM'), { h: 5, m: 14 });
    assert.deepEqual(parseTime12('12:05 AM'), { h: 0, m: 5 });
  });

  it('subtracts offset across hour and midnight', () => {
    assert.deepEqual(subtractMinutes(18, 32, 5), { h: 18, m: 27, dayDelta: 0 });
    assert.deepEqual(subtractMinutes(0, 10, 15), { h: 23, m: 55, dayDelta: -1 });
  });
});

describe('normalizeSettings', () => {
  it('fills defaults for bare input', () => {
    assert.deepEqual(normalizeSettings(undefined), DEFAULT_NOTIFICATION_SETTINGS);
    assert.deepEqual(normalizeSettings({}), DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('keeps valid overrides only', () => {
    const s = normalizeSettings({
      notif: { fajr: false, bogus: true },
      remind: 15,
      jumuah: false,
      news: false,
    });
    assert.equal(s.notif.fajr, false);
    assert.equal(s.notif.maghrib, true);
    assert.equal(s.remind, 15);
    assert.equal(s.jumuah, false);
    assert.equal(s.news, false);
  });
});

describe('mosque timezone helpers', () => {
  it('round-trips wall time in Africa/Lagos', () => {
    const ms = mosqueWallToUtcMs(2026, 4, 3, 18, 32, 0);
    const parts = getMosqueParts(new Date(ms));
    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 4);
    assert.equal(parts.day, 3);
    assert.equal(parts.hour, 18);
    assert.equal(parts.minute, 32);
  });

  it('freshness window is [0, 60s)', () => {
    const fire = 1_000_000;
    assert.equal(isWithinFreshness(fire, fire), true);
    assert.equal(isWithinFreshness(fire + 59_999, fire), true);
    assert.equal(isWithinFreshness(fire + FRESHNESS_MS, fire), false);
    assert.equal(isWithinFreshness(fire - 1, fire), false);
  });
});

describe('dueRemindersForSubscriber', () => {
  const endpoint = 'https://example.test/push/1';

  it('fires Maghrib at prayer time minus offset', () => {
    // Maghrib 6:32, offset 5 → 6:27
    const now = atLagos(2026, 4, 3, 18, 27, 10); // Friday 2026-04-03
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: { remind: 5, notif: { maghrib: true } },
      endpoint,
      sentLog: {},
    });
    assert.equal(due.length, 1);
    assert.equal(due[0].id, 'maghrib');
    assert.match(due[0].sentKey, /maghrib$/);
  });

  it('skips when prayer toggle is off', () => {
    const now = atLagos(2026, 4, 3, 18, 27, 10);
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: {
        remind: 5,
        notif: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      },
      endpoint,
      sentLog: {},
    });
    assert.equal(due.filter((d) => d.id === 'maghrib').length, 0);
  });

  it('skips when already in sent-log', () => {
    const now = atLagos(2026, 4, 3, 18, 27, 10);
    const sentKey = `${'2026-04-03'}:${endpoint}:maghrib`;
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: { remind: 5 },
      endpoint,
      sentLog: { [sentKey]: true },
    });
    assert.equal(due.find((d) => d.id === 'maghrib'), undefined);
  });

  it('skips late fires outside freshness', () => {
    const now = atLagos(2026, 4, 3, 18, 29, 0); // 2 min after 6:27
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: { remind: 5 },
      endpoint,
      sentLog: {},
    });
    assert.equal(due.find((d) => d.id === 'maghrib'), undefined);
  });

  it('on Friday does not fire Dhuhr even if Dhuhr is on and Jumu\'ah off', () => {
    // Dhuhr 12:48, offset 5 → 12:43 on Friday
    const now = atLagos(2026, 4, 3, 12, 43, 5);
    assert.equal(getMosqueParts(now).weekday, 'Fri');
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: {
        remind: 5,
        jumuah: false,
        notif: { dhuhr: true },
      },
      endpoint,
      sentLog: {},
    });
    assert.equal(due.find((d) => d.id === 'dhuhr'), undefined);
    assert.equal(due.find((d) => d.id === 'jumuah'), undefined);
  });

  it('on Friday fires Jumu\'ah at Khutbah − 30 when enabled', () => {
    // Khutbah 1:00 PM − 30 = 12:30
    const now = atLagos(2026, 4, 3, 12, 30, 15);
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: { jumuah: true, remind: 5 },
      endpoint,
      sentLog: {},
    });
    assert.ok(due.find((d) => d.id === 'jumuah'));
  });

  it('on a weekday fires Dhuhr and never Jumu\'ah', () => {
    // 2026-04-02 is Thursday
    const now = atLagos(2026, 4, 2, 12, 43, 5);
    assert.equal(getMosqueParts(now).weekday, 'Thu');
    const due = dueRemindersForSubscriber({
      now,
      times: TIMES,
      settings: { remind: 5, jumuah: true, notif: { dhuhr: true } },
      endpoint,
      sentLog: {},
    });
    assert.ok(due.find((d) => d.id === 'dhuhr'));
    assert.equal(due.find((d) => d.id === 'jumuah'), undefined);
  });
});

describe('collectDueReminders + pruneSentLog', () => {
  it('only includes subscribers whose offset matches now', () => {
    const now = atLagos(2026, 4, 2, 18, 27, 10); // Maghrib−5
    const subs = [
      {
        endpoint: 'a',
        settings: { remind: 5, notif: { maghrib: true } },
      },
      {
        endpoint: 'b',
        settings: { remind: 15, notif: { maghrib: true } }, // due at 6:17, not now
      },
    ];
    const due = collectDueReminders({ now, times: TIMES, subscribers: subs, sentLog: {} });
    assert.equal(due.length, 1);
    assert.equal(due[0].endpoint, 'a');
  });

  it('prunes old sent-log keys', () => {
    const now = atLagos(2026, 4, 3, 12, 0, 0);
    const pruned = pruneSentLog(
      {
        '2026-04-03:x:fajr': true,
        '2026-04-02:x:isha': true,
        '2026-03-01:x:fajr': true,
      },
      now,
    );
    assert.equal(pruned['2026-04-03:x:fajr'], true);
    assert.equal(pruned['2026-04-02:x:isha'], true);
    assert.equal(pruned['2026-03-01:x:fajr'], undefined);
  });
});
