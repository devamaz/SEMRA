/**
 * Tests for server/videos.js — YouTube channel feed parsing.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseVideosFeed } from '../server/videos.js';

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Suncity Estate Muslim Resident Association (SEMRA)</title>
 <entry>
  <yt:videoId>old-one</yt:videoId>
  <title>Day 1 Ramadan &amp; Khatm Al Quran</title>
  <published>2026-03-01T05:00:00+00:00</published>
  <media:thumbnail url="https://i2.ytimg.com/vi/old-one/hqdefault.jpg" width="480" height="360"/>
 </entry>
 <entry>
  <yt:videoId>new-one</yt:videoId>
  <title>Day 2 — Tahajjud (Quran)</title>
  <published>2026-03-02T06:00:00+00:00</published>
  <media:thumbnail url="https://i4.ytimg.com/vi/new-one/hqdefault.jpg" width="480" height="360"/>
 </entry>
</feed>`;

describe('parseVideosFeed', () => {
  it('extracts channel title and video fields', () => {
    const { channelTitle, videos } = parseVideosFeed(sampleXml);
    assert.equal(channelTitle, 'Suncity Estate Muslim Resident Association (SEMRA)');
    assert.equal(videos.length, 2);
    assert.deepEqual(
      { id: videos[0].id, published: videos[0].published },
      { id: 'new-one', published: '2026-03-02T06:00:00+00:00' },
    );
    assert.equal(videos[0].url, 'https://www.youtube.com/watch?v=new-one');
    assert.equal(videos[0].thumbnail, 'https://i4.ytimg.com/vi/new-one/hqdefault.jpg');
  });

  it('sorts entries newest first regardless of feed order', () => {
    const { videos } = parseVideosFeed(sampleXml);
    assert.deepEqual(
      videos.map((v) => v.id),
      ['new-one', 'old-one'],
    );
  });

  it('decodes XML entities in titles', () => {
    const { videos } = parseVideosFeed(sampleXml);
    assert.equal(videos[1].title, 'Day 1 Ramadan & Khatm Al Quran');
  });

  it('falls back to a constructed thumbnail when the feed omits one', () => {
    const xml = sampleXml.replace(/<media:thumbnail[\s\S]*?\/>/g, '');
    const { videos } = parseVideosFeed(xml);
    assert.equal(videos[0].thumbnail, 'https://i.ytimg.com/vi/new-one/hqdefault.jpg');
  });

  it('skips entries without an id or title', () => {
    const xml = sampleXml.replace(/<yt:videoId>old-one<\/yt:videoId>/, '');
    const { videos } = parseVideosFeed(xml);
    assert.deepEqual(
      videos.map((v) => v.id),
      ['new-one'],
    );
  });

  it('returns an empty list for a feed with no entries', () => {
    const { channelTitle, videos } = parseVideosFeed('<feed><title>SEMRA</title></feed>');
    assert.equal(channelTitle, 'SEMRA');
    assert.deepEqual(videos, []);
  });
});
