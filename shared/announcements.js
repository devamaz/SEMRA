/**
 * announcements — CRUD for mosque announcements stored in localStorage.
 *
 * Interface:
 *   getAll()            → Announcement[]
 *   add(announcement)   → void
 *   remove(index)       → void
 */

const STORE_KEY = 'scm_announcements';

const SEED = [
  { type: 'event', title: 'Eid ul-Adha arrangements', body: 'Eid prayer at 7:00 AM on the estate grounds. Please arrive by 6:30 AM. Qurbani collection open until Thursday.', tag: 'Eid', when: '2 days ago' },
  { type: 'gn',     title: 'Water supply at the masjid', body: 'New wudhu taps installed. Please keep the area dry and report leaks to the committee.', tag: 'Facility', when: '5 days ago' },
  { type: 'event',  title: 'Tafsir circle every Thursday', body: 'Weekly Tafsir after Maghrib, led by Ustadh Musa. All residents welcome.', tag: 'Programme', when: '1 week ago' }
];

let items = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved && saved.length > 0) return saved;
  } catch (e) { /* use seed */ }
  return structuredClone(SEED);
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

export function getAll() {
  return items;
}

export function add(announcement) {
  items.unshift({
    type: announcement.type || 'gn',
    title: announcement.title,
    body: announcement.body,
    tag: announcement.tag || 'General',
    when: 'just now'
  });
  save();
}

export function remove(index) {
  items.splice(index, 1);
  save();
}
