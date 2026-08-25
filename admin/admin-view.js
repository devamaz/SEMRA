/**
 * admin-view — Renders the Prayer Schedule for the admin panel.
 *
 * Interface:
 *   init(appEl, sheetEl)      → void
 *   render(settings)          → void
 */

import * as TimesData from '../shared/times-data.js';
import * as State from '../shared/state.js';
import * as Announcements from '../shared/announcements.js';

let appEl = null;
let sheetEl = null;
let editing = { id: null, h: 5, m: 14, ap: 'AM' };

function iconSvg(p) {
  let s;
  if (p.id === 'fajr')          s = '<path d="M12 3a5 5 0 0 0 5 5 5 5 0 0 0-5 5 5 5 0 0 0-5-5 5 5 0 0 0 5-5z"/><path d="M3 21h18"/>';
  else if (p.id === 'dhuhr')    s = '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>';
  else if (p.id === 'maghrib')  s = '<path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 6V3"/>';
  else if (p.id === 'isha')     s = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  else                          s = '<path d="M3 12h18M12 3v18"/>';
  return '<svg viewBox="0 0 24 24">' + s + '</svg>';
}

function el(tag, className, innerHTML) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML) e.innerHTML = innerHTML;
  return e;
}

// ── Sheet ──

function syncSheet() {
  document.getElementById('shH').textContent = editing.h;
  document.getElementById('shM').textContent = (editing.m < 10 ? '0' : '') + editing.m;
  document.querySelectorAll('#shAmpm button').forEach(b => {
    b.classList.toggle('sel', b.dataset.ap === editing.ap);
  });
}

function closeSheet() {
  sheetEl.classList.remove('on');
}

function openSheet(id) {
  editing.id = id;
  const p = TimesData.getPrayers().find(x => x.id === id);
  let label = id, sub = '';
  if (p) { label = p.name; sub = p.arabic + ' · ' + p.note; }
  if (id === 'jumuah')  { label = "Jumu'ah Iqamah"; sub = 'Friday congregational prayer'; }
  if (id === 'khutbah') { label = 'Khutbah Time';    sub = 'Before iqamah, Friday'; }

  document.getElementById('shName').textContent = label;
  document.getElementById('shSub').textContent = sub;

  const v = TimesData.to24(TimesData.getTime(id));
  editing.h = v.h % 12 || 12;
  editing.m = v.m;
  editing.ap = v.h >= 12 ? 'PM' : 'AM';
  syncSheet();
  sheetEl.classList.add('on');
}

async function saveSheet() {
  let h = editing.ap === 'PM'
    ? (editing.h === 12 ? 12 : editing.h + 12)
    : (editing.h === 12 ? 0 : editing.h);
  await TimesData.setTime(editing.id, TimesData.to12(h, editing.m));
  closeSheet();
  render(null, State.getSettings());
}

function bindSheetEvents() {
  document.getElementById('sheetBg').addEventListener('click', closeSheet);
  document.getElementById('shCancel').addEventListener('click', closeSheet);

  document.querySelectorAll('#sheet .numselect button').forEach(b => {
    b.addEventListener('click', () => {
      const lab = b.closest('.numselect').querySelector('label').textContent;
      if (lab === 'Hour') {
        editing.h += +b.dataset.d;
        if (editing.h > 12) editing.h = 1;
        if (editing.h < 1) editing.h = 12;
      } else {
        editing.m += +b.dataset.d;
        if (editing.m >= 60) { editing.h = (editing.h % 12) + 1; editing.m -= 60; }
        if (editing.m < 0)   { editing.h = editing.h === 1 ? 12 : editing.h - 1; editing.m += 60; }
      }
      syncSheet();
    });
  });

  document.querySelectorAll('#shAmpm button').forEach(b => {
    b.addEventListener('click', () => { editing.ap = b.dataset.ap; syncSheet(); });
  });

  document.getElementById('shSave').addEventListener('click', saveSheet);
}

// ── Render ──

function renderSchedule(settings) {
  const container = el('div', 'screen on');

  const hd = el('div', 'hd');
  hd.innerHTML = '<h1>Prayer Schedule</h1><p>Tap any time to correct it for Suncity Estate.</p>';
  container.appendChild(hd);

  const sec = el('div', 'sec');
  sec.style.marginTop = '14px';
  sec.innerHTML = '<div class="plist" id="editList"></div>';
  container.appendChild(sec);

  const prayers = TimesData.getPrayers();
  const list = sec.querySelector('#editList');
  prayers.forEach(p => {
    const on = settings.notif[p.id];
    const row = el('div', 'prow');
    row.innerHTML =
      '<div class="ic-ico">' + iconSvg(p) + '</div>' +
      '<div><div class="pn">' + p.name + ' <small>' + p.arabic + '</small></div></div>' +
      '<div class="pt">' + TimesData.getTime(p.id) + '<span class="pm">' + (p.note ? ' · ' + p.note : '') + '</span></div>' +
      '<div class="shots ' + (on ? 'on' : '') + '" data-shots="' + p.id + '"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>';

    row.querySelector('.pt').style.cursor = 'pointer';
    row.querySelector('.pt').addEventListener('click', () => openSheet(p.id));
    row.querySelector('[data-shots]').addEventListener('click', () => State.togglePrayerNotif(p.id));
    list.appendChild(row);
  });

  // Jumu'ah row
  const juSec = el('div', 'sec');
  juSec.innerHTML =
    '<div class="setting-group">' +
      '<div class="set-row" style="cursor:pointer" id="editJumuahRow">' +
        '<div class="lab"><b>Jumu\'ah Iqamah</b><small>Friday congregational prayer · Khutbah <span id="jukh2">' + TimesData.getTime('khutbah') + '</span></small></div>' +
        '<div style="font-weight:700;font-variant-numeric:tabular-nums;color:var(--deen-d)" id="juTime2">' + TimesData.getTime('jumuah') + '</div>' +
      '</div>' +
    '</div>';
  container.appendChild(juSec);
  juSec.querySelector('#editJumuahRow').addEventListener('click', () => openSheet('jumuah'));

  const foot = el('div', 'sec');
  foot.style.marginTop = '6px';
  foot.innerHTML = '<p style="font-size:12.5px;color:var(--muted);line-height:1.5">Times are saved on this device and used for notifications. Adjust as the season changes.</p>';
  container.appendChild(foot);

  appEl.appendChild(container);
}

function renderCompose(settings) {
  const container = el('div', 'screen on');

  const hd = el('div', 'hd');
  hd.innerHTML = '<h1>Send Notification</h1><p>Compose an announcement for the mosque community.</p>';
  container.appendChild(hd);

  // Type selector
  const secType = el('div', 'sec');
  secType.innerHTML =
    '<div class="setting-group">' +
      '<div class="set-row"><div class="lab"><b>Type</b><small>Event or general notice</small></div></div>' +
      '<div class="set-row" style="display:block"><div class="seg" id="composeType">' +
        '<button data-type="event" class="sel">Event</button>' +
        '<button data-type="gn">Notice</button>' +
      '</div></div>' +
    '</div>';
  container.appendChild(secType);

  // Tag input
  const secTag = el('div', 'sec');
  secTag.innerHTML =
    '<div class="setting-group">' +
      '<div class="set-row"><div class="lab"><b>Tag</b><small>Category label (e.g. Eid, Facility, Programme)</small></div></div>' +
      '<div class="set-row">' +
        '<input id="composeTag" type="text" placeholder="e.g. Eid" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-body);color:var(--fg);background:var(--paper)" />' +
      '</div>' +
    '</div>';
  container.appendChild(secTag);

  // Title input
  const secTitle = el('div', 'sec');
  secTitle.innerHTML =
    '<div class="setting-group">' +
      '<div class="set-row"><div class="lab"><b>Title</b><small>Headline for the announcement</small></div></div>' +
      '<div class="set-row">' +
        '<input id="composeTitle" type="text" placeholder="e.g. Eid prayer arrangements" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-body);color:var(--fg);background:var(--paper)" />' +
      '</div>' +
    '</div>';
  container.appendChild(secTitle);

  // Body input
  const secBody = el('div', 'sec');
  secBody.innerHTML =
    '<div class="setting-group">' +
      '<div class="set-row"><div class="lab"><b>Message</b><small>Full announcement text</small></div></div>' +
      '<div class="set-row">' +
        '<textarea id="composeBody" placeholder="Write the announcement..." style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-body);color:var(--fg);background:var(--paper);resize:vertical;min-height:100px"></textarea>' +
      '</div>' +
    '</div>';
  container.appendChild(secBody);

  // Send button
  const secSend = el('div', 'sec');
  secSend.innerHTML =
    '<button id="composeSend" class="btn primary" style="width:100%">Send Announcement</button>' +
    '<p style="font-size:12px;color:var(--muted);margin-top:8px;text-align:center">Announcement will be pushed to all subscribed devices.</p>';
  container.appendChild(secSend);

  // Previous announcements list (loaded from server)
  const secPrev = el('div', 'sec');
  secPrev.innerHTML = '<div class="sec-h" style="margin-top:8px"><h2>Sent Announcements</h2></div><div id="sentList"><p style="text-align:center;color:var(--muted);padding:20px">Loading…</p></div>';
  container.appendChild(secPrev);

  appEl.appendChild(container);

  // Fetch sent announcements from server
  fetch('/api/announcements')
    .then(res => res.json())
    .then(announcements => {
      renderSentList(announcements);
    })
    .catch(() => {
      renderSentList(Announcements.getAll());
    });

  function renderSentList(announcements) {
    const sentList = document.getElementById('sentList');
    sentList.innerHTML = '';

    if (announcements.length === 0) {
      sentList.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">No announcements sent yet.</p>';
      return;
    }

    announcements.forEach((n, i) => {
      const a = el('div', 'an ' + n.type);
      a.style.position = 'relative';
      const pinSvg = n.type === 'event'
        ? '<svg viewBox="0 0 24 24"><path d="M5 21h14M7 21V9l5-5 5 5v12M10 21v-6h4v6"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M3 5h18M3 12h18M3 19h12"/></svg>';
      a.innerHTML =
        '<div class="pin">' + pinSvg + '</div>' +
        '<div style="flex:1"><h3>' + n.title + '</h3><p>' + n.body + '</p>' +
        '<div class="meta"><span class="tag" style="color:' + (n.type === 'event' ? 'var(--gold-d)' : 'var(--deen)') + '">' + n.tag + '</span> · ' + n.when + '</div></div>' +
        '<button data-del="' + i + '" style="position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;font-size:16px;line-height:1">×</button>';
      container.appendChild(a);
    });

    // Delete buttons
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const index = +btn.dataset.del;
        try {
          await fetch('/api/announcements/' + index, { method: 'DELETE' });
        } catch (e) { /* server may be down; local delete is handled below */ }
        Announcements.remove(index);
        render('compose', settings);
      });
    });
  }

  // Type selector events
  secType.querySelectorAll('#composeType button').forEach(b => {
    b.addEventListener('click', () => {
      secType.querySelectorAll('#composeType button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
  });

  // Send button
  secSend.querySelector('#composeSend').addEventListener('click', async () => {
    const type = secType.querySelector('#composeType .sel').dataset.type;
    const tag = document.getElementById('composeTag').value.trim() || 'General';
    const title = document.getElementById('composeTitle').value.trim();
    const body = document.getElementById('composeBody').value.trim();

    if (!title || !body) {
      alert('Please fill in both title and message.');
      return;
    }

    // Save locally for immediate display
    Announcements.add({ type, tag, title, body });

    // Send to server for push delivery
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tag, title, body })
      });
      const result = await res.json();
      console.log(`📤 Notification sent: ${result.sent} delivered, ${result.failed} failed`);
    } catch (err) {
      console.warn('Could not reach server:', err);
    }

    // Trigger a local system notification as preview
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }

    // Clear form and re-render
    document.getElementById('composeTitle').value = '';
    document.getElementById('composeBody').value = '';
    document.getElementById('composeTag').value = '';
    render('compose', settings);
  });
}

// ── Events admin ──

let eventForm = {
  id: null,
  title: '',
  description: '',
  tag: '',
  date: '',
  time: '',
  location: '',
  notify: false
};

function emptyEventForm() {
  eventForm = {
    id: null,
    title: '',
    description: '',
    tag: '',
    date: '',
    time: '',
    location: '',
    notify: false
  };
}

function fillEventForm(event) {
  eventForm = {
    id: event.id,
    title: event.title || '',
    description: event.description || '',
    tag: event.tag || '',
    date: event.date || '',
    time: event.time || '',
    location: event.location || '',
    notify: false
  };
}

function fieldHtml(id, label, hint, value, type = 'text', extra = '') {
  return (
    '<div class="setting-group" style="margin-bottom:10px">' +
      '<div class="set-row"><div class="lab"><b>' + label + '</b><small>' + hint + '</small></div></div>' +
      '<div class="set-row">' +
        (type === 'textarea'
          ? '<textarea id="' + id + '" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-body);color:var(--fg);background:var(--paper);resize:vertical;min-height:88px">' + value + '</textarea>'
          : '<input id="' + id + '" type="' + type + '" value="' + value + '" ' + extra + ' style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-body);color:var(--fg);background:var(--paper)" />') +
      '</div>' +
    '</div>'
  );
}

function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(str) {
  return escapeAttr(str).replace(/>/g, '&gt;');
}

function renderEvents(settings) {
  const container = el('div', 'screen on');
  const editing = !!eventForm.id;

  const hd = el('div', 'hd');
  hd.innerHTML = editing
    ? '<h1>Edit Event</h1><p>Update the programme details for the public Events page.</p>'
    : '<h1>Events</h1><p>Create programmes shown on the website Events page.</p>';
  container.appendChild(hd);

  const form = el('div', 'sec');
  form.style.marginTop = '14px';
  form.innerHTML =
    fieldHtml('evTitle', 'Title', 'Headline on the card', escapeAttr(eventForm.title)) +
    fieldHtml('evTag', 'Tag', 'e.g. Eid, Halaqah, Academy', escapeAttr(eventForm.tag)) +
    fieldHtml('evDate', 'Date', 'Calendar day (YYYY-MM-DD)', escapeAttr(eventForm.date), 'date') +
    fieldHtml('evTime', 'Time', 'e.g. 6:30 AM or After Maghrib', escapeAttr(eventForm.time)) +
    fieldHtml('evLocation', 'Location', 'e.g. Main hall, Mosque grounds', escapeAttr(eventForm.location)) +
    fieldHtml('evDesc', 'Description', 'Short body for the public card', escapeAttr(eventForm.description), 'textarea') +
    '<div class="setting-group" style="margin-bottom:12px">' +
      '<div class="set-row">' +
        '<div class="lab"><b>Notify residents</b><small>Optional web push on save</small></div>' +
        '<div class="switch ' + (eventForm.notify ? 'on' : '') + '" id="evNotify"></div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:8px">' +
      '<button id="evSave" class="btn primary" style="flex:1">' + (editing ? 'Update event' : 'Create event') + '</button>' +
      (editing ? '<button id="evCancel" class="btn ghost">Cancel</button>' : '') +
    '</div>';
  container.appendChild(form);

  const listSec = el('div', 'sec');
  listSec.innerHTML =
    '<div class="sec-h" style="margin-top:16px"><h2>All events</h2></div>' +
    '<div id="evList"><p style="text-align:center;color:var(--muted);padding:20px">Loading…</p></div>';
  container.appendChild(listSec);

  appEl.appendChild(container);

  form.querySelector('#evNotify').addEventListener('click', () => {
    eventForm.notify = !eventForm.notify;
    form.querySelector('#evNotify').classList.toggle('on', eventForm.notify);
  });

  if (editing) {
    form.querySelector('#evCancel').addEventListener('click', () => {
      emptyEventForm();
      render('events', settings);
    });
  }

  form.querySelector('#evSave').addEventListener('click', async () => {
    const payload = {
      title: document.getElementById('evTitle').value.trim(),
      tag: document.getElementById('evTag').value.trim() || 'General',
      date: document.getElementById('evDate').value.trim(),
      time: document.getElementById('evTime').value.trim(),
      location: document.getElementById('evLocation').value.trim(),
      description: document.getElementById('evDesc').value.trim(),
      notify: eventForm.notify
    };

    if (!payload.title || !payload.description || !payload.date || !payload.time || !payload.location) {
      alert('Please fill title, description, date, time, and location.');
      return;
    }

    try {
      const url = eventForm.id ? '/api/events/' + eventForm.id : '/api/events';
      const method = eventForm.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not save event');
        return;
      }
      emptyEventForm();
      render('events', settings);
    } catch (err) {
      alert('Server unreachable');
    }
  });

  fetch('/api/events')
    .then((res) => res.json())
    .then((events) => {
      const box = document.getElementById('evList');
      if (!box) return;
      if (!events.length) {
        box.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">No events yet.</p>';
        return;
      }
      box.innerHTML = '';
      events.forEach((event) => {
        const row = el('div', 'an gn');
        row.style.position = 'relative';
        row.innerHTML =
          '<div style="flex:1;padding-right:72px">' +
            '<h3 style="margin:0 0 4px">' + event.title + '</h3>' +
            '<p style="margin:0 0 6px">' + event.description + '</p>' +
            '<div class="meta"><span class="tag" style="color:var(--gold-d)">' + event.tag + '</span> · ' +
              event.date + ' · ' + event.time + ' · ' + event.location +
            '</div>' +
          '</div>' +
          '<div style="position:absolute;top:12px;right:12px;display:flex;gap:6px">' +
            '<button data-edit="' + event.id + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:12px">Edit</button>' +
            '<button data-del="' + event.id + '" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--danger, #b33);cursor:pointer;font-size:12px">Del</button>' +
          '</div>';
        box.appendChild(row);
      });

      box.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const event = events.find((e) => e.id === btn.dataset.edit);
          if (!event) return;
          fillEventForm(event);
          render('events', settings);
          appEl.scrollTop = 0;
        });
      });

      box.querySelectorAll('[data-del]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this event?')) return;
          try {
            await fetch('/api/events/' + btn.dataset.del, { method: 'DELETE' });
            if (eventForm.id === btn.dataset.del) emptyEventForm();
            render('events', settings);
          } catch (err) {
            alert('Could not delete');
          }
        });
      });
    })
    .catch(() => {
      const box = document.getElementById('evList');
      if (box) box.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">Could not load events.</p>';
    });
}

// ── Academy admin ──

/**
 * Public Academy page settings (session, term, class days/times).
 * Loads the current record from /api/academy, edits in place, saves via PUT.
 */
function renderAcademy(settings) {
  const container = el('div', 'screen on');

  const hd = el('div', 'hd');
  hd.innerHTML = '<h1>Academy</h1><p>Session, term, and class times shown on the public Academy page.</p>';
  container.appendChild(hd);

  const sec = el('div', 'sec');
  sec.style.marginTop = '14px';
  sec.innerHTML = '<div id="acForm"><p style="text-align:center;color:var(--muted);padding:20px">Loading…</p></div>';
  container.appendChild(sec);

  appEl.appendChild(container);

  fetch('/api/academy')
    .then((res) => res.json())
    .then((academy) => buildAcademyForm(sec, academy, settings))
    .catch(() => {
      sec.querySelector('#acForm').innerHTML =
        '<p style="text-align:center;color:var(--muted);padding:20px">Could not load academy settings.</p>';
    });
}

function buildAcademyForm(sec, academy, settings) {
  const form = sec.querySelector('#acForm');
  const acad = {
    session: String(academy.session ?? ''),
    term: String(academy.term ?? ''),
    termStart: String(academy.termStart ?? ''),
    classes: Array.isArray(academy.classes)
      ? academy.classes.map((c) => ({ id: c.id, label: c.label ?? '', days: c.days ?? '', time: c.time ?? '', form: c.form ?? '' }))
      : []
  };

  const inputBase =
    'padding:10px 14px;border:1.5px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-body);color:var(--fg);background:var(--paper)';
  const inputStyle = 'width:100%;' + inputBase;

  form.innerHTML =
    fieldHtml('acSession', 'Session', 'e.g. 2026/2027', escapeAttr(acad.session)) +
    fieldHtml('acTerm', 'Term', 'e.g. 1st term', escapeAttr(acad.term)) +
    fieldHtml('acStart', 'First term starts', 'e.g. 12th of September', escapeAttr(acad.termStart)) +
    '<div class="setting-group" style="margin-bottom:10px">' +
      '<div class="set-row"><div class="lab"><b>Classes &amp; times</b><small>Days and times shown to visitors</small></div></div>' +
      '<div id="acClasses"></div>' +
      '<button id="acAdd" style="width:100%;margin-top:8px;padding:10px 14px;border-radius:12px;border:1.5px dashed var(--border);background:var(--surface);color:var(--accent);font-weight:600;font-size:13.5px;cursor:pointer">+ Add class</button>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">' +
      '<button id="acSave" class="btn primary" style="width:100%">Save changes</button>' +
      '<p id="acStatus" style="text-align:center;font-size:12.5px;color:var(--muted);margin:0">Changes appear on the public Academy page.</p>' +
    '</div>' +
    '<div class="setting-group" style="margin-top:18px;margin-bottom:10px">' +
      '<div class="set-row"><div class="lab"><b>Academy gallery</b><small>Photos &amp; videos shown on the public Academy page, newest first</small></div></div>' +
      '<div id="acGallery"><p style="text-align:center;color:var(--muted);padding:20px">Loading…</p></div>' +
    '</div>';

  function renderClassRows() {
    const box = form.querySelector('#acClasses');
    box.innerHTML = '';
    acad.classes.forEach((cls, i) => {
      const row = el('div', 'set-row');
      row.style.cssText = 'align-items:flex-end;flex-wrap:wrap;gap:6px;margin-bottom:6px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface)';
      row.innerHTML =
        '<input data-k="label" data-i="' + i + '" placeholder="Class label (e.g. Female Adults)" value="' + escapeAttr(cls.label) + '" style="flex:1 1 100%;' + inputBase + '" />' +
        '<input data-k="days" data-i="' + i + '" placeholder="Days (e.g. Saturdays & Sundays)" value="' + escapeAttr(cls.days) + '" style="flex:1 1 40%;min-width:150px;' + inputBase + '" />' +
        '<input data-k="time" data-i="' + i + '" placeholder="Time (e.g. 9:00 AM – 1:00 PM)" value="' + escapeAttr(cls.time) + '" style="flex:1 1 40%;min-width:150px;' + inputBase + '" />' +
        '<input data-k="form" data-i="' + i + '" placeholder="Form file (e.g. islamiyya form Adult.pdf)" value="' + escapeAttr(cls.form) + '" style="flex:1 1 100%;' + inputBase + '" />' +
        '<button data-del="' + i + '" aria-label="Remove class" style="flex:none;width:38px;height:38px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--danger,#b33);font-size:16px;cursor:pointer">×</button>';
      box.appendChild(row);
    });

    box.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        acad.classes[+inp.dataset.i][inp.dataset.k] = inp.value;
      });
    });
    box.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        acad.classes.splice(+btn.dataset.del, 1);
        renderClassRows();
      });
    });
  }
  renderClassRows();

  form.querySelector('#acAdd').addEventListener('click', () => {
    acad.classes.push({ id: null, label: '', days: '', time: '' });
    renderClassRows();
  });

  form.querySelector('#acSave').addEventListener('click', async () => {
    const payload = {
      session: document.getElementById('acSession').value.trim(),
      term: document.getElementById('acTerm').value.trim(),
      termStart: document.getElementById('acStart').value.trim(),
      classes: acad.classes.map((c) => ({
        id: c.id,
        label: c.label.trim(),
        days: c.days.trim(),
        time: c.time.trim(),
        form: c.form.trim()
      }))
    };

    if (!payload.session || !payload.term || !payload.termStart) {
      alert('Please fill in session, term, and first-term start date.');
      return;
    }
    if (!payload.classes.length || payload.classes.some((c) => !c.days || !c.time)) {
      alert('Every class needs days and a time.');
      return;
    }

    try {
      const res = await fetch('/api/academy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not save academy settings');
        return;
      }
      const status = form.querySelector('#acStatus');
      status.textContent = '✓ Saved — the public Academy page is up to date.';
      status.style.color = 'var(--success, #2a7a4b)';
    } catch (err) {
      alert('Server unreachable');
    }
  });

  renderAcademyGallery(form);
}

// ── Academy gallery admin ──

const GAL_INPUT =
  'padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:var(--font-body);color:var(--fg);background:var(--paper)';

function ytThumbId(url) {
  const m = String(url || '').match(/v=([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : '';
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function galleryItemRow(item) {
  const thumb =
    item.kind === 'photo'
      ? '<img src="/media/' + escapeAttr(item.file) + '" alt="" style="width:56px;height:40px;object-fit:cover;border-radius:8px;flex:none" />'
      : '<img src="https://i.ytimg.com/vi/' + escapeAttr(ytThumbId(item.url)) + '/hqdefault.jpg" alt="" style="width:56px;height:40px;object-fit:cover;border-radius:8px;flex:none" />';
  return (
    '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">' +
      thumb +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          escapeHtml(item.caption || (item.kind === 'photo' ? 'Untitled photo' : 'Untitled video')) +
        '</div>' +
        '<div style="font-size:11.5px;color:var(--muted)">' + escapeHtml(item.date || 'No date') + '</div>' +
      '</div>' +
      '<button data-del="' + escapeAttr(item.id) + '" aria-label="Remove" style="flex:none;width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--danger,#b33);cursor:pointer">×</button>' +
    '</div>'
  );
}

/** Build the upload/add forms and bind their handlers; lists refresh independently. */
function buildGalleryBlock(box, gallery) {
  const photos = Array.isArray(gallery.photos) ? gallery.photos : [];
  const videos = Array.isArray(gallery.videos) ? gallery.videos : [];

  box.innerHTML =
    '<div style="padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface);margin-bottom:10px">' +
      '<b style="font-size:13px">Add photos</b>' +
      '<input id="galPhotoFiles" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style="width:100%;margin:8px 0;font-size:12.5px" />' +
      '<input id="galPhotoCaption" placeholder="Caption (optional)" style="width:100%;margin-bottom:6px;' + GAL_INPUT + '" />' +
      '<input id="galPhotoDate" placeholder="Date (optional, e.g. 15 Sep 2026)" style="width:100%;' + GAL_INPUT + '" />' +
      '<button id="galPhotoUpload" class="btn primary" style="width:100%;margin-top:8px">Upload photos</button>' +
      '<p id="galPhotoStatus" style="font-size:12px;color:var(--muted);margin:8px 0 0"></p>' +
    '</div>' +
    '<div style="padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface);margin-bottom:10px">' +
      '<b style="font-size:13px">Add video (YouTube link)</b>' +
      '<input id="galVideoUrl" placeholder="e.g. https://youtu.be/… or youtube.com/watch?v=…" style="width:100%;margin-top:8px;' + GAL_INPUT + '" />' +
      '<input id="galVideoCaption" placeholder="Caption (optional)" style="width:100%;margin-top:6px;' + GAL_INPUT + '" />' +
      '<input id="galVideoDate" placeholder="Date (optional)" style="width:100%;margin-top:6px;' + GAL_INPUT + '" />' +
      '<button id="galVideoAdd" class="btn primary" style="width:100%;margin-top:8px">Add video</button>' +
      '<p id="galVideoStatus" style="font-size:12px;color:var(--muted);margin:8px 0 0"></p>' +
    '</div>' +
    '<div id="galPhotoList"></div>' +
    '<div id="galVideoList"></div>';

  const refreshGallery = () => {
    fetch('/api/academy')
      .then((res) => res.json())
      .then((academy) => renderGalleryLists(box, academy.gallery))
      .catch(() => {
        const photoList = box.querySelector('#galPhotoList');
        if (photoList) photoList.innerHTML = '<p style="font-size:12.5px;color:var(--muted);margin:8px 0">Could not load gallery.</p>';
      });
  };

  box.querySelector('#galPhotoUpload').addEventListener('click', async () => {
    const input = box.querySelector('#galPhotoFiles');
    const files = Array.from(input.files || []);
    const caption = box.querySelector('#galPhotoCaption').value.trim();
    const date = box.querySelector('#galPhotoDate').value.trim();
    const status = box.querySelector('#galPhotoStatus');
    if (!files.length) {
      status.textContent = 'Choose at least one image first.';
      return;
    }
    status.textContent = 'Uploading…';
    for (const file of files) {
      const data = await readAsDataURL(file);
      try {
        const res = await fetch('/api/academy/gallery/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: file.type, data, caption, date })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Upload failed');
      } catch (err) {
        status.textContent = 'Could not upload ' + file.name + ': ' + (err.message || 'server unreachable');
        return;
      }
    }
    input.value = '';
    box.querySelector('#galPhotoCaption').value = '';
    box.querySelector('#galPhotoDate').value = '';
    status.textContent = '✓ Photos added to the gallery.';
    status.style.color = 'var(--success, #2a7a4b)';
    refreshGallery();
  });

  box.querySelector('#galVideoAdd').addEventListener('click', async () => {
    const url = box.querySelector('#galVideoUrl').value.trim();
    const caption = box.querySelector('#galVideoCaption').value.trim();
    const date = box.querySelector('#galVideoDate').value.trim();
    const status = box.querySelector('#galVideoStatus');
    if (!url) {
      status.textContent = 'Paste a YouTube link first.';
      return;
    }
    try {
      const res = await fetch('/api/academy/gallery/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, caption, date })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not add video');
      box.querySelector('#galVideoUrl').value = '';
      box.querySelector('#galVideoCaption').value = '';
      box.querySelector('#galVideoDate').value = '';
      status.textContent = '✓ Video added to the gallery.';
      status.style.color = 'var(--success, #2a7a4b)';
      refreshGallery();
    } catch (err) {
      status.textContent = err.message || 'Could not add video';
    }
  });

  renderGalleryLists(box, { photos, videos });
}

/** Fill the photo/video lists and bind delete buttons. */
function renderGalleryLists(box, gallery) {
  const photos = Array.isArray(gallery?.photos) ? gallery.photos : [];
  const videos = Array.isArray(gallery?.videos) ? gallery.videos : [];
  const photoList = box.querySelector('#galPhotoList');
  const videoList = box.querySelector('#galVideoList');
  if (!photoList || !videoList) return;

  photoList.innerHTML =
    '<div class="sec-h" style="margin-top:6px"><h2 style="font-size:15px">Photos</h2></div>' +
    (photos.length
      ? photos.map((p) => galleryItemRow({ ...p, kind: 'photo' })).join('')
      : '<p style="font-size:12.5px;color:var(--muted);margin:8px 0">No photos yet.</p>');
  videoList.innerHTML =
    '<div class="sec-h" style="margin-top:6px"><h2 style="font-size:15px">Videos</h2></div>' +
    (videos.length
      ? videos.map((v) => galleryItemRow({ ...v, kind: 'video' })).join('')
      : '<p style="font-size:12.5px;color:var(--muted);margin:8px 0">No videos yet.</p>');

  photoList.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this photo from the gallery?')) return;
      try {
        await fetch('/api/academy/gallery/photo/' + btn.dataset.del, { method: 'DELETE' });
        refreshGalleryLists();
      } catch (err) {
        alert('Could not delete');
      }
    });
  });
  videoList.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this video from the gallery?')) return;
      try {
        await fetch('/api/academy/gallery/video/' + btn.dataset.del, { method: 'DELETE' });
        refreshGalleryLists();
      } catch (err) {
        alert('Could not delete');
      }
    });
  });

  function refreshGalleryLists() {
    fetch('/api/academy')
      .then((res) => res.json())
      .then((academy) => renderGalleryLists(box, academy.gallery))
      .catch(() => { /* leave lists as-is on failure */ });
  }
}

/** Fetch the gallery and build the admin block inside the Academy form. */
function renderAcademyGallery(form) {
  const box = form.querySelector('#acGallery');
  fetch('/api/academy')
    .then((res) => res.json())
    .then((academy) => buildGalleryBlock(box, academy.gallery))
    .catch(() => {
      box.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">Could not load gallery.</p>';
    });
}

// ── Public interface ──

let activeScreen = 'schedule';

export function init(_appEl, _sheetEl) {
  appEl = _appEl;
  sheetEl = _sheetEl;
  bindSheetEvents();
}

export function render(screen, settings) {
  if (screen) activeScreen = screen;
  appEl.innerHTML = '';

  switch (activeScreen) {
    case 'schedule': renderSchedule(settings); break;
    case 'events':   renderEvents(settings);   break;
    case 'academy':  renderAcademy(settings);  break;
    case 'compose':  renderCompose(settings);  break;
  }
}
