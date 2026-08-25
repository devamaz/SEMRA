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
  const galleryEl = document.getElementById('acadGallery');
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

    renderGallery(academy.gallery && academy.gallery.photos, academy.gallery && academy.gallery.videos);
  } catch (err) {
    if (sessionEl) sessionEl.textContent = '—';
    if (termEl) termEl.textContent = '—';
    if (startEl) startEl.textContent = '—';
    classesEl.innerHTML =
      '<p class="events-empty">Unable to reach the server. Please try again shortly.</p>';
    if (galleryEl) {
      galleryEl.innerHTML =
        '<p class="events-empty">Unable to reach the server. Please try again shortly.</p>';
    }
  }
}

// ── Academy gallery (photos stored on the server, videos linked to YouTube) ──

function ytVideoId(url) {
  const m = String(url || '').match(/v=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function galCap(item) {
  const bits = [];
  if (item.caption) bits.push(escapeHtml(item.caption));
  if (item.date) bits.push('<small>' + escapeHtml(item.date) + '</small>');
  return bits.length ? '<span class="gal-cap">' + bits.join('') + '</span>' : '';
}

function galleryCard(item) {
  if (item.kind === 'photo') {
    return (
      '<button type="button" class="gal-card" data-lb="photo"' +
        ' data-src="/media/' + escapeHtml(item.file) + '"' +
        ' data-cap="' + escapeHtml(item.caption || '') + '">' +
        '<span class="gal-thumb"><img src="/media/' + escapeHtml(item.file) + '" alt="' +
          escapeHtml(item.caption || 'Academy photo') + '" loading="lazy" /></span>' +
        galCap(item) +
      '</button>'
    );
  }
  const vid = ytVideoId(item.url);
  return (
    '<button type="button" class="gal-card" data-lb="video"' +
      ' data-yt="' + escapeHtml(vid) + '"' +
      ' data-cap="' + escapeHtml(item.caption || '') + '">' +
      '<span class="gal-thumb">' +
        '<img src="https://i.ytimg.com/vi/' + escapeHtml(vid) + '/hqdefault.jpg" alt="' +
          escapeHtml(item.caption || 'Academy video') + '" loading="lazy" />' +
        '<span class="gal-play"><span aria-hidden="true">▶</span></span>' +
      '</span>' +
      galCap(item) +
    '</button>'
  );
}

function renderGallery(photos, videos) {
  const galleryEl = document.getElementById('acadGallery');
  if (!galleryEl) return;

  const items = [
    ...(Array.isArray(photos) ? photos.map((p) => ({ ...p, kind: 'photo' })) : []),
    ...(Array.isArray(videos) ? videos.map((v) => ({ ...v, kind: 'video' })) : [])
  ];

  if (!items.length) {
    galleryEl.innerHTML =
      '<p class="events-empty">The committee will share academy photos and videos here soon.</p>';
    return;
  }

  // Newest first; rows without a timestamp keep their server order.
  items.sort((a, b) => (a.addedAt && b.addedAt ? (a.addedAt < b.addedAt ? 1 : -1) : 0));
  galleryEl.innerHTML = items.map(galleryCard).join('');
  galleryEl.querySelectorAll('.gal-card').forEach((card) => {
    card.addEventListener('click', () => openLightbox(card.dataset));
  });
}

// ── Gallery lightbox (photos enlarged, videos play in place) ──

let lightbox = null;

function openLightbox(d) {
  closeLightbox();
  lightbox = document.createElement('div');
  lightbox.className = 'gal-lb';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', d.cap || 'Gallery item');

  const box = document.createElement('div');
  box.className = 'gal-lb-box';

  if (d.lb === 'video') {
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube.com/embed/' + escapeHtml(d.yt) + '?autoplay=1';
    frame.title = d.cap || 'Academy video';
    frame.setAttribute('frameborder', '0');
    frame.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    frame.setAttribute('allowfullscreen', '');
    box.appendChild(frame);
  } else {
    const img = document.createElement('img');
    img.src = d.src;
    img.alt = d.cap || 'Academy photo';
    box.appendChild(img);
  }

  const close = document.createElement('button');
  close.className = 'gal-lb-x';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', closeLightbox);
  box.appendChild(close);

  if (d.cap) {
    const cap = document.createElement('p');
    cap.className = 'gal-lb-cap';
    cap.textContent = d.cap;
    box.appendChild(cap);
  }

  lightbox.appendChild(box);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.body.appendChild(lightbox);
}

function closeLightbox() {
  if (lightbox) {
    lightbox.remove();
    lightbox = null;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

loadAcademyPage();
