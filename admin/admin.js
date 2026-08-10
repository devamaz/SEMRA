/**
 * admin — Admin-facing composition entry.
 *
 * Wires times-data, state, and admin-view for Schedule + Compose.
 */

import * as TimesData from '../shared/times-data.js';
import * as State from '../shared/state.js';
import * as View from './admin-view.js';

const appEl = document.getElementById('app');
const sheetEl = document.getElementById('sheet');
const clockEl = document.getElementById('clock');
const navButtons = document.querySelectorAll('.nav button');

View.init(appEl, sheetEl);

// Subscribe view to state changes
State.subscribe((settings) => {
  View.render(null, settings);
});

// ── Nav tab switching ──

navButtons.forEach(btn => {
  btn.addEventListener('click', async () => {
    const go = btn.dataset.go;
    navButtons.forEach(b => b.classList.toggle('on', b === btn));
    
    // Re-fetch times from server when switching to Schedule
    if (go === 'schedule') await TimesData.init();
    
    View.render(go, State.getSettings());
    appEl.scrollTop = 0;
  });
});

// ── Clock ──

function tick() {
  const now = new Date();
  clockEl.textContent = TimesData.to12(now.getHours(), now.getMinutes());
}

// ── Start ──

TimesData.init().then(() => {
  View.render('schedule', State.getSettings());
});
tick();
setInterval(tick, 60000);
