/**
 * main — User-facing composition entry.
 *
 * Wires times-data, state, announcements, and user-view.
 * Registers the browser as a Subscriber (push + Notification settings).
 */

import * as TimesData from '../shared/times-data.js';
import * as State from '../shared/state.js';
import * as View from './user-view.js';
import * as Install from './install.js';

const appEl = document.getElementById('app');
const clockEl = document.getElementById('clock');
const navButtons = document.querySelectorAll('.nav button');

View.init(appEl);
Install.init();

// When installability appears or app is installed, refresh current screen UI
Install.subscribe(() => {
  View.render(null, State.getSettings());
});

/** Push endpoint for this install; set after subscribe or existing registration. */
let pushEndpoint = null;

// Re-render on settings changes and sync Notification settings to the server
State.subscribe((settings) => {
  View.render(null, settings);
  syncSettingsToServer(settings);
});

// ── Nav tab switching ──

navButtons.forEach((btn) => {
  btn.addEventListener('click', async () => {
    const go = btn.dataset.go;
    navButtons.forEach((b) => b.classList.toggle('on', b === btn));
    if (go === 'news') btn.classList.remove('notif-dot');

    if (go === 'today') await TimesData.init();

    View.render(go, State.getSettings());
    appEl.scrollTop = 0;
  });
});

// ── Clock tick ──

function tick() {
  const now = new Date();
  clockEl.textContent = TimesData.to12(now.getHours(), now.getMinutes());
  View.tick();
}

// ── Notification permission & Subscriber registration ──

const VAPID_PUBLIC =
  'BAR6CO0dempNehU07brFsFaphumuN3lfMsWItTn6QdM3EhQt2FDjggaKu1mvNnM7ogACyQrYZe2TwJThgy-U9UI';

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function postSubscriber(subscription, settings) {
  const res = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription:
        typeof subscription.toJSON === 'function'
          ? subscription.toJSON()
          : subscription,
      settings,
    }),
  });
  if (!res.ok) {
    throw new Error('subscribe failed: ' + res.status);
  }
}

async function syncSettingsToServer(settings) {
  if (!pushEndpoint) return;
  try {
    const res = await fetch('/api/subscribe', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: pushEndpoint, settings }),
    });
    if (!res.ok) {
      console.warn('Could not sync notification settings:', res.status);
    }
  } catch (err) {
    console.warn('Could not sync notification settings:', err);
  }
}

/**
 * If this browser already has a push subscription, adopt it and refresh
 * Notification settings on the server (returning resident).
 */
async function adoptExistingSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    pushEndpoint = sub.endpoint;
    await postSubscriber(sub, State.getSettings());
    console.log('📤 Existing Subscriber refreshed');
  } catch (err) {
    console.warn('Could not adopt existing push subscription:', err);
  }
}

async function setupNotifications() {
  if (!('Notification' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC),
      });
    }
    pushEndpoint = sub.endpoint;
    await postSubscriber(sub, State.getSettings());
    console.log('🔔 Subscriber registered');
  } catch (e) {
    console.warn('Push subscription failed:', e);
  }
}

// ── Start ──

TimesData.init().then(() => {
  View.render('today', State.getSettings());
});
View.refreshNewsDot();
tick();
setInterval(tick, 1000);

adoptExistingSubscription();

// Request notification permission after first interaction
document.addEventListener(
  'click',
  function askOnce() {
    setupNotifications();
    document.removeEventListener('click', askOnce);
  },
  { once: true },
);
