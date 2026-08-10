/**
 * Tests for store.js Academy normalization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAcademy } from '../server/store.js';

const valid = {
  session: '2026/2027',
  term: '1st term',
  termStart: '12th of September',
  classes: [
    { label: 'Children', days: 'Saturdays & Sundays', time: '9:00 AM – 1:00 PM' },
    { label: 'Female Adults', days: 'Saturdays & Sundays', time: '4:00 PM – 6:00 PM' },
  ],
};

describe('normalizeAcademy', () => {
  it('rejects missing session, term, or termStart', () => {
    assert.ok(normalizeAcademy({ ...valid, session: '' }).error);
    assert.ok(normalizeAcademy({ ...valid, term: '  ' }).error);
    assert.ok(normalizeAcademy({ ...valid, termStart: undefined }).error);
  });

  it('rejects empty classes and rows missing days or time', () => {
    assert.ok(normalizeAcademy({ ...valid, classes: [] }).error);
    assert.match(
      normalizeAcademy({ ...valid, classes: [{ label: 'X', days: '', time: '1:00 PM' }] }).error,
      /days and time/,
    );
  });

  it('accepts a valid payload and defaults class labels', () => {
    const { academy } = normalizeAcademy({
      ...valid,
      classes: [{ days: 'Mondays', time: '4:00 PM' }],
    });
    assert.equal(academy.session, '2026/2027');
    assert.equal(academy.term, '1st term');
    assert.equal(academy.termStart, '12th of September');
    assert.equal(academy.classes.length, 1);
    assert.equal(academy.classes[0].label, 'Class');
    assert.ok(academy.classes[0].id);
  });

  it('defaults the adult class to the adult registration form', () => {
    const { academy } = normalizeAcademy({
      ...valid,
      classes: [{ label: 'Female Adults', days: 'Saturdays & Sundays', time: '4:00 PM – 6:00 PM' }],
    });
    assert.equal(academy.classes[0].form, 'islamiyya form Adult.pdf');
  });

  it('defaults other classes to the universal registration form', () => {
    const { academy } = normalizeAcademy({
      ...valid,
      classes: [{ label: 'Children', days: 'Saturdays', time: '9:00 AM' }],
    });
    assert.equal(academy.classes[0].form, 'islamiyya form universal.pdf');
  });

  it('keeps an explicit form and preserves it on update', () => {
    const existing = {
      session: '2026/2027',
      term: '1st term',
      termStart: '12th of September',
      classes: [{ id: 'acad-1', label: 'Female Adults', days: 'Saturdays', time: '9:00 AM', form: 'islamiyya form Adult.pdf' }],
    };
    const { academy } = normalizeAcademy(
      { ...valid, classes: [{ label: 'Female Adults', days: 'Sundays', time: '10:00 AM' }] },
      existing,
    );
    assert.equal(academy.classes[0].id, 'acad-1');
    assert.equal(academy.classes[0].form, 'islamiyya form Adult.pdf');

    const explicit = normalizeAcademy({
      ...valid,
      classes: [{ label: 'Female Adults', days: 'Sundays', time: '10:00 AM', form: 'islamiyya form Adult.pdf' }],
    });
    assert.equal(explicit.academy.classes[0].form, 'islamiyya form Adult.pdf');
  });

  it('preserves existing ids for the same row position when updating', () => {
    const existing = {
      session: '2026/2027',
      term: '1st term',
      termStart: '12th of September',
      classes: [{ id: 'acad-1', label: 'Old', days: 'Saturdays', time: '9:00 AM' }],
    };
    const { academy } = normalizeAcademy(
      { ...valid, classes: [{ days: 'Sundays', time: '10:00 AM' }] },
      existing,
    );
    assert.equal(academy.classes[0].id, 'acad-1');
  });
});
