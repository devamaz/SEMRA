/**
 * Public Academy page — load session, term, and class times from /api/academy.
 */

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function classCard(cls) {
  return `
    <article class="ev">
      <div class="ev-body" style="width: 100%">
        <span class="ev-tag">${escapeHtml(cls.label || 'Class')}</span>
        <h3>${escapeHtml(cls.days)}</h3>
        <p>${escapeHtml(cls.time)}</p>
        <div class="ev-meta">
          <span>Academy hall</span>
          <span>Suncity Estate Mosque</span>
        </div>
      </div>
    </article>`;
}

async function loadAcademyPage() {
  const sessionEl = document.getElementById('acadSession');
  const termEl = document.getElementById('acadTerm');
  const startEl = document.getElementById('acadStart');
  const classesEl = document.getElementById('acadClasses');
  if (!classesEl) return;

  try {
    const res = await fetch('/api/academy');
    if (!res.ok) throw new Error('bad status');
    const academy = await res.json();

    if (sessionEl) sessionEl.textContent = academy.session || '—';
    if (termEl) termEl.textContent = academy.term || '—';
    if (startEl) startEl.textContent = academy.termStart || '—';

    if (Array.isArray(academy.classes) && academy.classes.length) {
      classesEl.innerHTML = academy.classes.map(classCard).join('');
    } else {
      classesEl.innerHTML =
        '<p class="events-empty">The committee will publish class times here.</p>';
    }
  } catch (err) {
    if (sessionEl) sessionEl.textContent = '—';
    if (termEl) termEl.textContent = '—';
    if (startEl) startEl.textContent = '—';
    classesEl.innerHTML =
      '<p class="events-empty">Unable to reach the server. Please try again shortly.</p>';
  }
}

loadAcademyPage();
