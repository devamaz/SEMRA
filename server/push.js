/**
 * push — web-push setup, the shared send routine, and expired-subscription pruning.
 */

import webpush from 'web-push';
import { readSubscribers, writeSubscribers } from './store.js';

// ── VAPID keys (generated for this app) ──

const VAPID_PUBLIC  = 'BAR6CO0dempNehU07brFsFaphumuN3lfMsWItTn6QdM3EhQt2FDjggaKu1mvNnM7ogACyQrYZe2TwJThgy-U9UI';
const VAPID_PRIVATE = 'nMyHoD3q-PU7mlh86wckhEMPIH7ANgnSHRNY0p2McFI';

webpush.setVapidDetails(
  'mailto:admin@suncitymosque.local',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

function toPushSubscription(sub) {
  return {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: sub.keys,
  };
}

/**
 * Shared send routine — one notification to one Subscriber.
 *
 * Resolves with `{ expired: true, endpoint }` when the subscription is no
 * longer valid (HTTP 404/410); rejects on any other failure.
 */
export async function sendOne(sub, { title, body, url = '/app/', type = 'committee' }) {
  const payload = JSON.stringify({ title, body, url, type });
  return webpush.sendNotification(toPushSubscription(sub), payload).catch((err) => {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { expired: true, endpoint: sub.endpoint };
    }
    throw err;
  });
}

/**
 * Send one payload shape to many Subscribers in parallel.
 *
 * Individual failures never reject the batch — inspect `results` for
 * per-target outcomes (same contract as `sendOne`).
 *
 * @param {{ sub: object, payload: { title: string, body: string, url?: string, type?: string } }[]} targets
 * @returns {Promise<{ results: PromiseSettledResult<object>[], expired: string[] }>}
 */
export async function sendMany(targets) {
  const results = await Promise.allSettled(
    targets.map(({ sub, payload }) => sendOne(sub, payload)),
  );
  const expired = results
    .filter((r) => r.status === 'fulfilled' && r.value?.expired)
    .map((r) => r.value.endpoint);
  return { results, expired };
}

/**
 * Drop expired endpoints from the Subscriber store and log the count.
 *
 * Re-reads the list at prune time so registrations that landed while a send
 * batch was in flight are not lost.
 */
export function pruneExpired(expired) {
  if (expired.length === 0) return;
  const expiredSet = new Set(expired);
  writeSubscribers(readSubscribers().filter((s) => !expiredSet.has(s.endpoint)));
  console.log(`🧹 Removed ${expired.length} expired subscriptions`);
}

/**
 * Broadcast to all Subscribers (optionally filtered) and prune expired ones.
 *
 * @param {{ title: string, body: string, url?: string, type?: string }} payload
 * @param {{ predicate?: (sub: object) => boolean }} [options]
 */
export async function pushAll({ title, body, url = '/app/', type = 'committee' }, { predicate } = {}) {
  const all = readSubscribers();
  const targeted = predicate ? all.filter(predicate) : all;

  const { results, expired } = await sendMany(
    targeted.map((sub) => ({ sub, payload: { title, body, url, type } })),
  );
  pruneExpired(expired);

  const sent = results.filter((r) => r.status === 'fulfilled' && !r.value?.expired).length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `📤 Notification sent: ${sent} delivered, ${failed} failed, ${expired.length} expired (of ${targeted.length} targeted)`,
  );
  return { sent, failed, expired: expired.length, targeted: targeted.length };
}
