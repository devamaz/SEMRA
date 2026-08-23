/**
 * Tests for shared/hijri.js — Umm al-Qura (Hijri) date conversion.
 *
 * The module must match Intl.DateTimeFormat('en-u-ca-islamic-umalqura')
 * exactly — it replaces Intl because Android WebView renders the Islamic
 * calendar wrong ("March 10, 1448 BC AH", Chromium issue 40856332) and
 * modern ICU already includes the era, causing "…1448 AH AH".
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatHijriDate, hijriFromGregorian } from '../shared/hijri.js';

const intl = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

describe('formatHijriDate', () => {
  it('formats known anchor dates', () => {
    assert.equal(formatHijriDate(new Date(Date.UTC(2018, 8, 11))), 'Muharram 1, 1440 AH');
    assert.equal(formatHijriDate(new Date(Date.UTC(2024, 2, 11))), 'Ramadan 1, 1445 AH');
    assert.equal(formatHijriDate(new Date(Date.UTC(2026, 2, 10))), 'Ramadan 21, 1447 AH');
    assert.equal(formatHijriDate(new Date(Date.UTC(2026, 7, 23))), 'Rabiʻ I 10, 1448 AH');
  });

  it('includes the era exactly once (no "AH AH")', () => {
    const s = formatHijriDate(new Date(Date.UTC(2026, 7, 23)));
    assert.equal((s.match(/AH/g) || []).length, 1);
    assert.ok(s.endsWith(' AH'));
  });

  it('returns null for dates outside the table range', () => {
    assert.equal(hijriFromGregorian(2200, 1, 1), null);
    assert.equal(formatHijriDate(new Date(Date.UTC(2200, 0, 1))), null);
  });

  it('matches Intl islamic-umalqura across the valid range', () => {
    // Sample every 5th day 1980–2070 (valid range is 1356–1500 AH).
    let checked = 0;
    for (let t = Date.UTC(1980, 0, 1); t <= Date.UTC(2070, 11, 31); t += 5 * 86400000) {
      const d = new Date(t);
      assert.equal(formatHijriDate(d), intl.format(d), `mismatch on ${d.toISOString().slice(0, 10)}`);
      checked += 1;
    }
    assert.ok(checked > 6500, `expected a full sweep, checked ${checked}`);
  });
});
