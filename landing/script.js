/* ============ ICON DEFINITIONS (monoline, 1.7px) ============ */
const ICONS = {
  fajr:'<path d="M12 3v3"/><path d="M3 13a9 9 0 0 1 18 0"/><path d="M2 18h20"/><circle cx="12" cy="13" r="4"/>',
  dhuhr:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="m4.9 4.9 2.1 2.1"/><path d="m17 17 2.1 2.1"/><path d="m19.1 4.9-2.1 2.1"/><path d="m7 7-2.1 2.1"/>',
  asr:'<circle cx="12" cy="10" r="4"/><path d="M3 20h18"/><path d="M8 20a4 4 0 0 1 8 0"/>',
  maghrib:'<path d="M3 13a9 9 0 0 1 18 0"/><path d="M2 18h20"/><path d="M12 18a5 5 0 0 0 0-5Z"/>',
  isha:'<path d="M21 12.8A8 8 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'
};

/* ============ PRAYER TIMES (from SEMRA /api/times) ============ */
const PRAYER_DEFS = [
  {id:'fajr', name:'Fajr'},
  {id:'dhuhr', name:'Dhuhr'},
  {id:'asr', name:'Asr'},
  {id:'maghrib', name:'Maghrib'},
  {id:'isha', name:'Isha'}
];

// Fallback if API unreachable (matches last-known defaults)
let PRAYERS = PRAYER_DEFS.map(p => ({ ...p, adhan: '—', am: 0 }));
let jumuahTime = '—';
let khutbahTime = '—';

function toMinutes(str){
  const m = String(str || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = +m[1];
  const mm = +m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + mm;
}

function applyTimes(times){
  PRAYERS = PRAYER_DEFS.map(p => {
    const adhan = times[p.id] || '—';
    return { id: p.id, name: p.name, adhan, am: toMinutes(adhan) };
  });
  jumuahTime = times.jumuah || '—';
  khutbahTime = times.khutbah || '—';
  const juEl = document.getElementById('jumuahTime');
  const juSub = document.getElementById('jumuahSub');
  if (juEl) juEl.textContent = jumuahTime;
  if (juSub) juSub.textContent = 'Khutbah ' + khutbahTime + ' · Iqāmah ' + jumuahTime;
  buildPrayerGrid();
  updatePrayer();
}

async function loadTimes(){
  try {
    const res = await fetch('/api/times');
    if (!res.ok) throw new Error('bad status');
    applyTimes(await res.json());
  } catch (e) {
    // Keep grid placeholders; countdown stays idle until times load
    buildPrayerGrid();
  }
}

function buildPrayerGrid(){
  const grid = document.getElementById('prayerGrid');
  grid.innerHTML = PRAYERS.map(p=>`
    <div class="pcard" role="listitem" data-id="${p.id}">
      <svg class="picon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[p.id]}</svg>
      <div class="pname">${p.name}</div>
      <div class="adhan" data-adhan>${p.adhan}</div>
      <div class="iqama">Scheduled</div>
    </div>`).join('');
}

function nowMinutes(){ const d=new Date(); return d.getHours()*60+d.getMinutes()+d.getSeconds()/60; }

function updatePrayer(){
  if (!PRAYERS.length || !PRAYERS[0].am) return;
  const now = nowMinutes();
  let next = null, minsAway = Infinity;
  for (const p of PRAYERS) {
    if (now < p.am) {
      const diff = p.am - now;
      if (diff < minsAway) { minsAway = diff; next = p; }
    }
  }
  if (!next) {
    next = PRAYERS[0];
    minsAway = (1440 - now) + PRAYERS[0].am;
  }

  document.getElementById('nextName').innerHTML =
    next.name + ' at <span style="color:var(--gold)">' + next.adhan + '</span>';

  document.querySelectorAll('.tag-next').forEach(t => t.remove());
  document.querySelectorAll('.pcard').forEach(c => c.classList.remove('is-next'));
  const card = document.querySelector('.pcard[data-id="' + next.id + '"]');
  if (card) {
    card.classList.add('is-next');
    const t = document.createElement('span');
    t.className = 'tag-next';
    t.textContent = 'NEXT';
    card.appendChild(t);
  }

  const totalSec = Math.max(0, Math.round(minsAway * 60));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  document.getElementById('cdTime').textContent =
    String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function setDates(){
  try{
    const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(new Date());
    const greg  = new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date());
    document.getElementById('hijriText').textContent = hijri + ' AH';
    document.getElementById('gregText').textContent = greg;
    document.getElementById('hijriHero').textContent = hijri + ' AH';
  }catch(e){
    document.getElementById('hijriText').textContent = '—';
    document.getElementById('gregText').textContent = new Date().toDateString();
  }
}

/* ============ COPY ACCOUNT ============ */
const copyBtn = document.getElementById('copyAcct');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('0002923259');
      document.getElementById('copyLabel').textContent = 'Copied';
      setTimeout(() => document.getElementById('copyLabel').textContent = 'Copy', 1600);
    } catch (e) {
      document.getElementById('copyLabel').textContent = 'Select to copy';
    }
  });
}

/* ============ DONATION FLOW (state machine) ============ */
const donateRoot = document.getElementById('donate');
if (donateRoot) {
  const D = { step: 1, amount: 10000, freq: 'one', method: 'paystack', name: '', email: '', phone: '' };
  const stepNames = ['Amount', 'Details', 'Confirm'];
  const fmtN = (n) => '₦' + Number(n).toLocaleString('en-NG');

  function renderSteps() {
    const box = document.getElementById('steps');
    if (!box) return;
    box.innerHTML = stepNames.map((n, i) => {
      const idx = i + 1;
      const cls = idx === D.step ? 'active' : (idx < D.step ? 'done' : '');
      return `<div class="step ${cls}"><span class="step-num">${idx}</span>${n}</div>` + (i < 2 ? '<div class="step-bar"></div>' : '');
    }).join('');
  }

  function showStep(n) {
    D.step = n;
    ['step1', 'step2', 'step3'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.hidden = (i + 1 !== n);
    });
    renderSteps();
    if (n === 3) renderSummary();
    if (n === 2) renderStep2Sub();
  }

  function renderStep2Sub() {
    const m = D.method;
    const txt = m === 'paystack' ? 'So we can confirm your gift and send your Paystack receipt.'
      : m === 'transfer' ? 'So we can acknowledge your transfer and match it to you.'
      : 'So we can set up and track your monthly pledge.';
    const el = document.getElementById('step2Sub');
    if (el) el.textContent = txt;
  }

  function methodLabel() {
    return {
      paystack: 'Paystack (card / USSD)',
      transfer: 'Bank transfer (TAJ Bank)',
      pledge: 'Monthly pledge'
    }[D.method];
  }

  function renderSummary() {
    const rows = [
      ['Amount', fmtN(D.amount)],
      ['Frequency', D.freq === 'one' ? 'One-time' : 'Monthly pledge'],
      ['Method', methodLabel()],
      [D.name ? 'Name' : 'Given anonymously', D.name || 'Anonymous donor'],
      [D.email ? 'Email' : 'Email', D.email || '—']
    ];
    document.getElementById('summary').innerHTML =
      rows.map((r) => `<div class="row"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('') +
      `<div class="row total"><dt>You're giving</dt><dd>${fmtN(D.amount)}${D.freq === 'monthly' ? ' / mo' : ''}</dd></div>`;
    const note = D.method === 'paystack'
      ? `You'll be securely redirected to Paystack to complete payment with your card or via USSD.`
      : D.method === 'transfer'
      ? `Transfer ${fmtN(D.amount)} to TAJ Bank · 0002923259 · SUNCITY ESTATE MUSLIM RESIDENTS ASSOCIATION. We'll match your transfer to the name above.`
      : `We'll email your pledge schedule and a monthly reminder. You can pause or adjust anytime.`;
    document.getElementById('methodNote').textContent = note;
    document.getElementById('fundsNote').textContent = '100% funds the mosque, academy, and community welfare.';
  }

  const amounts = document.getElementById('amounts');
  if (amounts) {
    amounts.addEventListener('click', (e) => {
      const b = e.target.closest('.amount-btn');
      if (!b) return;
      D.amount = Number(b.dataset.amt);
      document.querySelectorAll('.amount-btn').forEach((x) => x.classList.toggle('sel', x === b));
      document.getElementById('customAmt').value = '';
    });
  }

  const customAmt = document.getElementById('customAmt');
  if (customAmt) {
    customAmt.addEventListener('input', (e) => {
      const v = Number(e.target.value);
      if (v > 0) {
        D.amount = v;
        document.querySelectorAll('.amount-btn').forEach((x) => x.classList.remove('sel'));
      } else if (!e.target.value) {
        D.amount = 10000;
        document.querySelector('.amount-btn[data-amt="10000"]').classList.add('sel');
      }
    });
  }

  const freq = document.getElementById('freq');
  if (freq) {
    freq.addEventListener('click', (e) => {
      const b = e.target.closest('.freq-btn');
      if (!b) return;
      D.freq = b.dataset.freq;
      document.querySelectorAll('.freq-btn').forEach((x) => x.classList.toggle('sel', x === b));
    });
  }

  const methods = document.getElementById('methods');
  if (methods) {
    methods.addEventListener('click', (e) => {
      const b = e.target.closest('.method');
      if (!b) return;
      D.method = b.dataset.method;
      document.querySelectorAll('.method').forEach((x) => {
        x.classList.toggle('sel', x === b);
        x.setAttribute('aria-checked', x === b ? 'true' : 'false');
      });
    });
  }

  const to2 = document.getElementById('to2');
  if (to2) {
    to2.addEventListener('click', () => {
      let err = document.getElementById('amtErr');
      if (D.amount < 100) {
        if (!err) {
          err = document.createElement('p');
          err.id = 'amtErr';
          err.className = 'what-funds';
          err.style.cssText = 'color:oklch(0.55 0.14 55);margin:-4px 0 14px;text-align:left';
          err.textContent = 'Please enter an amount of ₦100 or more.';
          document.getElementById('customAmt').insertAdjacentElement('afterend', err);
        }
        return;
      }
      if (err) err.remove();
      showStep(2);
    });
  }

  const back2 = document.getElementById('back2');
  if (back2) back2.addEventListener('click', () => showStep(1));

  const to3 = document.getElementById('to3');
  if (to3) {
    to3.addEventListener('click', () => {
      D.name = document.getElementById('donorName').value.trim();
      D.email = document.getElementById('donorEmail').value.trim();
      D.phone = document.getElementById('donorPhone').value.trim();
      showStep(3);
    });
  }

  const back3 = document.getElementById('back3');
  if (back3) back3.addEventListener('click', () => showStep(2));

  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      finishBtn.textContent = 'Thank you ✓';
      finishBtn.disabled = true;
      finishBtn.style.opacity = '.7';
      if (back3) back3.disabled = true;
    });
  }

  renderSteps();
}

/* ============ HOME EVENTS STRIP ============ */
const HOME_EVENT_IMAGES = [
  'assets/images/mosque2.jpeg',
  'assets/images/mosque1.jpeg',
  'assets/images/mosque3.jpeg',
];
const HOME_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function homeTodayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function homeEventCard(event, index) {
  const m = String(event.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = m ? String(Number(m[3])) : '—';
  const mon = m ? (HOME_MONTHS[Number(m[2]) - 1] || '') : '';
  const img = HOME_EVENT_IMAGES[index % HOME_EVENT_IMAGES.length];
  return (
    '<article class="ev">' +
      '<div class="ev-img">' +
        '<img src="' + img + '" alt="' + escapeHtml(event.title) + '" />' +
        '<div class="ev-date"><b>' + escapeHtml(day) + '</b><span>' + escapeHtml(mon) + '</span></div>' +
      '</div>' +
      '<div class="ev-body">' +
        '<span class="ev-tag">' + escapeHtml(event.tag) + '</span>' +
        '<h3>' + escapeHtml(event.title) + '</h3>' +
        '<p>' + escapeHtml(event.description) + '</p>' +
        '<div class="ev-meta">' +
          '<span>' + escapeHtml(event.time) + '</span>' +
          '<span>' + escapeHtml(event.location) + '</span>' +
        '</div>' +
      '</div>' +
    '</article>'
  );
}

async function loadHomeEvents() {
  const grid = document.getElementById('homeEventsGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/events');
    if (!res.ok) throw new Error('bad status');
    const events = await res.json();
    const today = homeTodayISO();
    const upcoming = events.filter((e) => e.date >= today).slice(0, 3);
    if (upcoming.length) {
      grid.innerHTML = upcoming.map((e, i) => homeEventCard(e, i)).join('');
      return;
    }
    // No upcoming events — surface the most recent past ones instead
    const recent = events.filter((e) => e.date < today).slice(-3).reverse();
    if (recent.length) {
      grid.innerHTML = recent.map((e, i) => homeEventCard(e, i)).join('');
      return;
    }
    grid.innerHTML = '<p class="events-empty">No upcoming events yet. <a href="/events.html">See all programmes</a></p>';
  } catch (err) {
    grid.innerHTML = '<p class="events-empty">Could not load events. <a href="/events.html">Try the events page</a></p>';
  }
}

/* ============ INIT (home) ============ */
if (document.getElementById('prayerGrid')) {
  setDates();
  loadTimes();
  setInterval(updatePrayer, 1000);
  setInterval(setDates, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') loadTimes();
  });
}
loadHomeEvents();
