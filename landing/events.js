/**
 * Public Events page — load calendar Events from /api/events.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const IMAGES = [
  'assets/images/mosque2.jpeg',
  'assets/images/mosque1.jpeg',
  'assets/images/mosque3.jpeg',
];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseDateParts(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { day: '—', mon: '', year: '' };
  return {
    day: String(Number(m[3])),
    mon: MONTHS[Number(m[2]) - 1] || '',
    year: m[1],
  };
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function eventCard(event, index) {
  const { day, mon } = parseDateParts(event.date);
  const img = IMAGES[index % IMAGES.length];
  return `
    <article class="ev">
      <div class="ev-img">
        <img src="${img}" alt="${escapeHtml(event.title)}" />
        <div class="ev-date"><b>${escapeHtml(day)}</b><span>${escapeHtml(mon)}</span></div>
      </div>
      <div class="ev-body">
        <span class="ev-tag">${escapeHtml(event.tag)}</span>
        <h3>${escapeHtml(event.title)}</h3>
        <p>${escapeHtml(event.description)}</p>
        <div class="ev-meta">
          <span>${escapeHtml(event.time)}</span>
          <span>${escapeHtml(event.location)}</span>
        </div>
      </div>
    </article>`;
}

function renderList(container, events, emptyMessage) {
  if (!events.length) {
    container.innerHTML = `<p class="events-empty">${escapeHtml(emptyMessage)}</p>`;
    return;
  }
  container.innerHTML = events.map((e, i) => eventCard(e, i)).join('');
}

async function loadEventsPage() {
  const upcomingEl = document.getElementById('upcomingGrid');
  const pastEl = document.getElementById('pastGrid');
  const statusEl = document.getElementById('eventsStatus');
  if (!upcomingEl) return;

  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('bad status');
    const events = await res.json();
    const today = todayISO();
    const upcoming = events.filter((e) => e.date >= today);
    const past = events.filter((e) => e.date < today).reverse();

    if (statusEl) {
      statusEl.textContent = upcoming.length
        ? `${upcoming.length} upcoming`
        : 'No upcoming programmes — check back soon';
    }

    renderList(upcomingEl, upcoming, 'No upcoming events yet. The committee will post programmes here.');
    if (pastEl) {
      const pastWrap = document.getElementById('pastSection');
      if (past.length === 0) {
        if (pastWrap) pastWrap.hidden = true;
      } else {
        if (pastWrap) pastWrap.hidden = false;
        renderList(pastEl, past, '');
      }
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Could not load events';
    upcomingEl.innerHTML = '<p class="events-empty">Unable to reach the server. Please try again shortly.</p>';
  }
}

loadEventsPage();
