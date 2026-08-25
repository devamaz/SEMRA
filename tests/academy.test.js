/**
 * Tests for store.js Academy normalization.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAcademy,
  normalizeYouTubeUrl,
  decodeImageUpload,
} from '../server/store.js';

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

  it('defaults an empty gallery on creation', () => {
    const { academy } = normalizeAcademy(valid);
    assert.deepEqual(academy.gallery, { photos: [], videos: [] });
  });

  it('preserves the gallery when editing academy settings', () => {
    const existing = {
      session: '2026/2027',
      term: '1st term',
      termStart: '12th of September',
      classes: [{ id: 'acad-1', label: 'Old', days: 'Saturdays', time: '9:00 AM' }],
      gallery: {
        photos: [
          { id: 'p1', file: 'a.jpg', caption: 'Morning class', date: '15 Sep 2026', addedAt: '2026-09-15T09:00:00.000Z' },
          { id: 'p2', file: 'b.jpg', caption: '', date: '', addedAt: '' },
          { id: 'broken', date: 'x' } /* missing file → dropped */
        ],
        videos: [
          { id: 'v1', url: 'https://www.youtube.com/watch?v=abc123', caption: 'Recitation', date: '', addedAt: '2026-09-14T09:00:00.000Z' },
          { id: 'broken-v' } /* missing url → dropped */
        ]
      }
    };
    const { academy } = normalizeAcademy({ ...valid, term: '2nd term' }, existing);
    assert.equal(academy.term, '2nd term');
    assert.equal(academy.gallery.photos.length, 2);
    assert.equal(academy.gallery.photos[0].file, 'a.jpg');
    assert.equal(academy.gallery.videos.length, 1);
    assert.equal(academy.gallery.videos[0].url, 'https://www.youtube.com/watch?v=abc123');
  });
});

describe('normalizeYouTubeUrl', () => {
  it('canonicalizes watch, youtu.be, shorts, and embed links', () => {
    assert.deepEqual(normalizeYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), {
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    assert.deepEqual(normalizeYouTubeUrl('https://youtu.be/dQw4w9WgXcQ'), {
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    assert.deepEqual(normalizeYouTubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ?si=x'), {
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    assert.deepEqual(normalizeYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ'), {
      videoId: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  });

  it('rejects non-YouTube links', () => {
    assert.match(normalizeYouTubeUrl('https://vimeo.com/12345').error, /YouTube/);
    assert.match(normalizeYouTubeUrl('https://example.com/watch?v=dQw4w9WgXcQ').error, /YouTube/);
    assert.match(normalizeYouTubeUrl('').error, /YouTube/);
  });
});

describe('decodeImageUpload', () => {
  it('decodes a base64 data URL into a buffer with a safe filename', () => {
    const png = Buffer.from('fake-png-bytes').toString('base64');
    const { file, fileName } = decodeImageUpload({ type: 'image/png', data: 'data:image/png;base64,' + png });
    assert.deepEqual(file, Buffer.from('fake-png-bytes'));
    assert.match(fileName, /^[0-9a-f-]{36}\.png$/);
  });

  it('rejects unsupported types and missing data', () => {
    assert.match(decodeImageUpload({ type: 'image/tiff', data: 'x' }).error, /unsupported/);
    assert.match(decodeImageUpload({ type: 'image/jpeg' }).error, /required/);
    assert.match(decodeImageUpload({}).error, /unsupported/);
  });
});
