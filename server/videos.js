/**
 * SEMRA videos — latest uploads from the SEMRA YouTube channel.
 *
 * Source: the channel's public RSS feed — no API key, no quota:
 *   https://www.youtube.com/feeds/videos.xml?channel_id=UC50v62zvv3BGvjeFofSYx_A
 *
 * The feed lists the ~15 most recent uploads and is itself cached by
 * YouTube for ~15 minutes, so we layer a short in-process cache on top
 * and re-parse per request. Browser clients cannot fetch the feed
 * directly (no CORS headers), hence this server proxy (ADR 0005).
 */

const CHANNEL_HANDLE = '@semra-suncity';
const CHANNEL_ID = 'UC50v62zvv3BGvjeFofSYx_A';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CHANNEL_URL = `https://www.youtube.com/${CHANNEL_HANDLE}`;

const CACHE_TTL_MS = 10 * 60 * 1000; // YouTube revalidates its own feed at ~15 min
const FETCH_TIMEOUT_MS = 10_000;
const RECENT_LIMIT = 11; // latest + 11 recent = 12 cards (feed gives ~15)

let cache = { at: 0, data: null };

export const channel = {
  id: CHANNEL_ID,
  handle: CHANNEL_HANDLE,
  url: CHANNEL_URL,
};

function decodeXmlEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Parse the YouTube channel feed XML into a flat, newest-first video list.
 * Pure and deterministic — unit-tested in tests/videos.test.js.
 */
export function parseVideosFeed(xml) {
  const feedTitle = decodeXmlEntities(
    (xml.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '',
  );

  const videos = [];
  for (const entry of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const body = entry[1];
    const id = (body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (body.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
    const published = (body.match(/<published>([^<]+)<\/published>/) || [])[1];
    const thumbnail = (body.match(/<media:thumbnail\s+url="([^"]+)"/) || [])[1];
    if (!id || !title) continue;

    videos.push({
      id,
      title: decodeXmlEntities(title),
      published,
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
    });
  }

  videos.sort((a, b) => (a.published < b.published ? 1 : -1));
  return { channelTitle: feedTitle, videos };
}

async function fetchFeed() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: { 'user-agent': 'SEMRA-server/1.0' },
    });
    if (!res.ok) throw new Error(`YouTube feed returned ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Latest video + recent uploads from the SEMRA channel.
 * Serves stale cache when YouTube is unreachable rather than failing.
 */
export async function getLatestVideos() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const xml = await fetchFeed();
    const { channelTitle, videos } = parseVideosFeed(xml);
    const [latest, ...recent] = videos;
    cache = {
      at: now,
      data: {
        channel: { ...channel, title: channelTitle || CHANNEL_HANDLE },
        latest: latest || null,
        recent: recent.slice(0, RECENT_LIMIT),
        fetchedAt: new Date(now).toISOString(),
      },
    };
  } catch (err) {
    if (cache.data) return cache.data; // stale-while-revalidate fallback
    throw err;
  }
  return cache.data;
}
