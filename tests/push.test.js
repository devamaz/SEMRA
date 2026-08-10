/**
 * Tests for push.js — sendOne/sendMany error mapping and batch semantics.
 *
 * web-push's sendNotification is mocked with node:test's mock.method, so
 * no network traffic and no real Subscribers are touched.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import { sendOne, sendMany } from '../server/push.js';

const SUB = {
  endpoint: 'https://push.test/s/1',
  expirationTime: null,
  keys: { p256dh: 'k', auth: 'a' },
};

beforeEach(() => {
  mock.method(webpush, 'sendNotification', async () => ({ statusCode: 201 }));
});

afterEach(() => {
  mock.restoreAll();
});

describe('sendOne', () => {
  it('resolves with the webpush response on success', async () => {
    const result = await sendOne(SUB, { title: 'T', body: 'B' });
    assert.equal(result.statusCode, 201);
  });

  it('maps HTTP 410 to { expired: true, endpoint }', async () => {
    webpush.sendNotification.mock.mockImplementation(async () => {
      throw { statusCode: 410 };
    });
    const result = await sendOne(SUB, { title: 'T', body: 'B' });
    assert.deepEqual(result, { expired: true, endpoint: SUB.endpoint });
  });

  it('maps HTTP 404 to expired as well', async () => {
    webpush.sendNotification.mock.mockImplementation(async () => {
      throw { statusCode: 404 };
    });
    const result = await sendOne(SUB, { title: 'T', body: 'B' });
    assert.deepEqual(result, { expired: true, endpoint: SUB.endpoint });
  });

  it('rejects on any other failure', async () => {
    webpush.sendNotification.mock.mockImplementation(async () => {
      throw new Error('network down');
    });
    await assert.rejects(() => sendOne(SUB, { title: 'T', body: 'B' }), /network down/);
  });

  it('sends the push-subscription shape and the payload as JSON', async () => {
    await sendOne(SUB, { title: 'T', body: 'B', url: '/app/' });
    const call = webpush.sendNotification.mock.calls[0];
    assert.deepEqual(call.arguments[0], {
      endpoint: SUB.endpoint,
      expirationTime: null,
      keys: SUB.keys,
    });
    assert.deepEqual(JSON.parse(call.arguments[1]), {
      title: 'T',
      body: 'B',
      url: '/app/',
      type: 'committee',
    });
  });

  it('passes an explicit type through to the payload', async () => {
    await sendOne(SUB, { title: 'T', body: 'B', url: '/app/', type: 'adhan' });
    const call = webpush.sendNotification.mock.calls[0];
    assert.deepEqual(JSON.parse(call.arguments[1]), {
      title: 'T',
      body: 'B',
      url: '/app/',
      type: 'adhan',
    });
  });
});

describe('sendMany', () => {
  it('never rejects the batch when individual sends fail', async () => {
    webpush.sendNotification.mock.mockImplementation(async (sub) => {
      if (sub.endpoint.endsWith('/expired')) throw { statusCode: 410 };
      if (sub.endpoint.endsWith('/boom')) throw new Error('boom');
      return { statusCode: 201 };
    });

    const targets = [
      { sub: { ...SUB, endpoint: SUB.endpoint + '/ok' }, payload: { title: 'T', body: 'B' } },
      { sub: { ...SUB, endpoint: SUB.endpoint + '/expired' }, payload: { title: 'T', body: 'B' } },
      { sub: { ...SUB, endpoint: SUB.endpoint + '/boom' }, payload: { title: 'T', body: 'B' } },
    ];

    const { results, expired } = await sendMany(targets);

    assert.equal(results.length, 3);
    assert.equal(results[0].status, 'fulfilled');
    assert.equal(results[1].status, 'fulfilled'); // expired is a fulfilled result, not a rejection
    assert.equal(results[2].status, 'rejected');
    assert.deepEqual(expired, [targets[1].sub.endpoint]);
  });

  it('starts all sends before awaiting any of them (parallel, not serial)', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let release;
    const gate = new Promise((r) => { release = r; });
    webpush.sendNotification.mock.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await gate;
      inFlight -= 1;
      return { statusCode: 201 };
    });

    const targets = [1, 2, 3].map((n) => ({
      sub: { ...SUB, endpoint: `${SUB.endpoint}/${n}` },
      payload: { title: 'T', body: 'B' },
    }));

    const pending = sendMany(targets);
    // sendMany's map is synchronous — all three sends start immediately.
    assert.equal(webpush.sendNotification.mock.calls.length, 3);
    release();
    await pending;
    assert.equal(maxInFlight, 3);
  });
});
