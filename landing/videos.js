/**
 * Public Videos page — load the Latest video + recent uploads from /api/videos.
 * The newest upload changes automatically whenever the committee publishes
 * to the SEMRA YouTube channel; no manual updates here.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHANNEL_URL = 'https://www.youtube.com/@semra-suncity';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function renderFeatured(el, video) {
  el.innerHTML = `
    <div class="video-embed">
      <iframe
        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?rel=0"
        title="${escapeHtml(video.title)}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    </div>
    <div class="video-meta">
      <span class="ev-tag">Latest video</span>
      <h2>${escapeHtml(video.title)}</h2>
      <p class="video-date">${escapeHtml(formatDate(video.published))}</p>
      <a class="btn btn--ghost" href="${escapeHtml(video.url)}" target="_blank" rel="noopener"
        >Watch on YouTube</a
      >
    </div>`;
}

function videoCard(video) {
  return `
    <a class="vid-card" href="${escapeHtml(video.url)}" target="_blank" rel="noopener">
      <div class="vid-img">
        <img src="${escapeHtml(video.thumbnail)}" alt="" loading="lazy" />
      </div>
      <div class="vid-body">
        <h3>${escapeHtml(video.title)}</h3>
        <span class="vid-date">${escapeHtml(formatDate(video.published))}</span>
      </div>
    </a>`;
}

function emptyMessage(text, linkLabel) {
  return `<p class="videos-empty">${escapeHtml(text)} <a href="${escapeHtml(CHANNEL_URL)}" target="_blank" rel="noopener">${escapeHtml(linkLabel)}</a></p>`;
}

async function loadVideosPage() {
  const featuredEl = document.getElementById('featuredVideo');
  const gridEl = document.getElementById('recentGrid');
  const statusEl = document.getElementById('videosStatus');
  if (!featuredEl) return;

  try {
    const res = await fetch('/api/videos');
    if (!res.ok) throw new Error('bad status');
    const { channel, latest, recent } = await res.json();

    if (statusEl) statusEl.textContent = channel.title || '@semra-suncity';

    if (latest) {
      renderFeatured(featuredEl, latest);
    } else {
      featuredEl.innerHTML = emptyMessage('No videos published yet.', 'Visit our channel on YouTube');
    }

    if (gridEl) {
      gridEl.innerHTML = recent.length
        ? recent.map(videoCard).join('')
        : emptyMessage('More uploads will appear here.', 'Visit our channel on YouTube');
    }
  } catch (err) {
    if (statusEl) statusEl.textContent = 'Could not load YouTube';
    featuredEl.innerHTML = emptyMessage(
      "We couldn't reach YouTube right now.",
      'Watch on YouTube instead',
    );
    if (gridEl) gridEl.innerHTML = '';
  }
}

loadVideosPage();
