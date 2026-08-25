/**
 * dua-data — Curated Du'a & Adhkār content and the daily Dhikr tally.
 *
 * Content ships with the app bundle; the committee does not author it
 * (see CONTEXT.md "Du'a"). Tallies are per-device, per-day, and reset
 * at the start of each day in Mosque local time (Africa/Lagos).
 *
 * Interface:
 *   getSegments()              → [{id, label}]
 *   getDuas(segmentId)         → [{id, ar, tr, n}]
 *   getTally(duaId)            → count
 *   bumpTally(duaId)           → newCount
 */

import * as TimesData from "./times-data.js";

const TALLY_KEY = "scm_dhikr";
const MOSQUE_TZ = "Africa/Lagos";

export const SEGMENTS = [
  { id: "after", label: "After Ṣalāh" },
  { id: "morning", label: "Morning" },
  { id: "evening", label: "Evening" },
];

const KURSI = {
  ar: "ٱللَّٰهُ لَا إِلَٰهَ إِلَّا هُوَ ٱلْحَيُّ ٱلْقَيُّومُ، لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ، لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ، مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥ إِلَّا بِإِذْنِهِۦ، يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ، وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦ إِلَّا بِمَا شَآءَ، وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ، وَلَا يَئُودُهُۥ حِفْظُهُمَا، وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ",
  tr: "Allah — none has the right to be worshipped except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep… (Ayat al-Kursi, 2:255)",
};

const DUAS = {
  morning: [
    { id: "m1", ...KURSI, n: 1 },
    {
      id: "m2",
      ar: "أَصْبَحْنَا وَأَصْبَحَ ٱلْمُلْكُ لِلَّٰهِ، وَٱلْحَمْدُ لِلَّٰهِ، لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      tr: "We have entered the morning and all dominion this morning belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.",
      n: 1,
    },
    {
      id: "m3",
      ar: "ٱللَّٰهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ ٱلْمَصِيرُ",
      tr: "O Allah, by You we enter the morning and by You we enter the evening. By You we live and by You we die, and to You is the return.",
      n: 1,
    },
    {
      id: "m4",
      ar: "بِسْمِ ٱللَّٰهِ ٱلَّذِي لَا يَضُرُّ مَعَ ٱسْمِهِ شَيْءٌ فِي ٱلْأَرْضِ وَلَا فِي ٱلسَّمَاءِ وَهُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
      tr: "In the name of Allah, with whose name nothing on earth or in heaven can cause harm — He is the All-Hearing, the All-Knowing.",
      n: 3,
    },
    {
      id: "m5",
      ar: "رَضِيتُ بِٱللَّٰهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
      tr: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.",
      n: 3,
    },
    {
      id: "m6",
      ar: "حَسْبِيَ ٱللَّٰهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ",
      tr: "Allah is sufficient for me. None has the right to be worshipped except Him. Upon Him I rely, and He is the Lord of the Mighty Throne.",
      n: 7,
    },
    {
      id: "m7",
      ar: "سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ",
      tr: "How free from every imperfection is Allah, and to Him is all praise.",
      n: 100,
    },
  ],
  evening: [
    { id: "e1", ...KURSI, n: 1 },
    {
      id: "e2",
      ar: "أَمْسَيْنَا وَأَمْسَى ٱلْمُلْكُ لِلَّٰهِ، وَٱلْحَمْدُ لِلَّٰهِ، لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      tr: "We have entered the evening and all dominion this evening belongs to Allah. All praise is for Allah. None has the right to be worshipped except Allah, alone, without partner.",
      n: 1,
    },
    {
      id: "e3",
      ar: "ٱللَّٰهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ ٱلْمَصِيرُ",
      tr: "O Allah, by You we enter the evening and by You we enter the morning. By You we live and by You we die, and to You is the return.",
      n: 1,
    },
    {
      id: "e4",
      ar: "أَعُوذُ بِكَلِمَاتِ ٱللَّٰهِ ٱلتَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
      tr: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
      n: 3,
    },
    {
      id: "e5",
      ar: "بِسْمِ ٱللَّٰهِ ٱلَّذِي لَا يَضُرُّ مَعَ ٱسْمِهِ شَيْءٌ فِي ٱلْأَرْضِ وَلَا فِي ٱلسَّمَاءِ وَهُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
      tr: "In the name of Allah, with whose name nothing on earth or in heaven can cause harm — He is the All-Hearing, the All-Knowing.",
      n: 3,
    },
    {
      id: "e6",
      ar: "رَضِيتُ بِٱللَّٰهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا",
      tr: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.",
      n: 3,
    },
    {
      id: "e7",
      ar: "حَسْبِيَ ٱللَّٰهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ",
      tr: "Allah is sufficient for me. None has the right to be worshipped except Him. Upon Him I rely, and He is the Lord of the Mighty Throne.",
      n: 7,
    },
    {
      id: "e8",
      ar: "سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ",
      tr: "How free from every imperfection is Allah, and to Him is all praise.",
      n: 100,
    },
  ],
  after: [
    {
      id: "a1",
      ar: "أَسْتَغْفِرُ ٱللَّٰهَ",
      tr: "I seek Allah's forgiveness.",
      n: 3,
    },
    {
      id: "a2",
      ar: "اللَّٰهُمَّ أَنْتَ ٱلسَّلَامُ، وَمِنْكَ ٱلسَّلَامُ، تَبَارَكْتَ يَا ذَا ٱلْجَلَالِ وَٱلْإِكْرَامِ",
      tr: "O Allah, You are Peace, and from You comes peace. Blessed are You, O Possessor of Majesty and Honour.",
      n: 1,
    },
    {
      id: "a3",
      ar: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ ٱلْمُلْكُ وَلَهُ ٱلْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      tr: "None has the right to be worshipped except Allah, alone, without partner. His is the dominion, His is the praise, and He is able to do all things.",
      n: 10,
    },
    {
      id: "a4",
      ar: "سُبْحَانَ ٱللَّٰهِ",
      tr: "Glory be to Allah.",
      n: 33,
    },
    {
      id: "a5",
      ar: "ٱلْحَمْدُ لِلَّٰهِ",
      tr: "All praise is for Allah.",
      n: 33,
    },
    {
      id: "a6",
      ar: "ٱللَّٰهُ أَكْبَرُ",
      tr: "Allah is the Greatest.",
      n: 34,
    },
    { id: "a7", ...KURSI, n: 1 },
  ],
};

export function getSegments() {
  return SEGMENTS;
}

export function getDuas(segmentId) {
  return DUAS[segmentId] || [];
}

/** Today's date key in Mosque local time, e.g. "2025-06-14". */
function dateKey(d) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: MOSQUE_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

function todayKey() {
  return dateKey(new Date());
}

/**
 * Epoch for After-Ṣalāh tallies: the most recent Prayer whose time plus a
 * 20-minute grace period has passed. Before Fajr's window opens, the active
 * epoch is yesterday's Isha — the post-Isha cycle runs until then.
 */
function afterEpoch() {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  let passed = null;
  for (const p of TimesData.getPrayers()) {
    const t = TimesData.to24(TimesData.getTime(p.id));
    if (cur >= t.h * 60 + t.m + 20) passed = p.id;
  }
  return passed
    ? todayKey() + "-" + passed
    : dateKey(new Date(now.getTime() - 86400000)) + "-isha";
}

/** After-Ṣalāh duas use ids starting with "a" (a1…a7); others are daily. */
function bucketFor(duaId) {
  return duaId[0] === "a" ? "after" : "daily";
}

function loadTally() {
  let t = null;
  try {
    t = JSON.parse(localStorage.getItem(TALLY_KEY));
  } catch (e) {
    /* corrupt — start fresh */
  }
  if (!t || typeof t !== "object") t = {};

  const day = todayKey();
  const ae = afterEpoch();
  if (t.day !== day || !t.daily) {
    t.day = day;
    t.daily = {}; // Morning / Evening tallies reset each day
  }
  if (t.afterEpoch !== ae || !t.after) {
    t.afterEpoch = ae; // After-Ṣalāh tallies reset per salah (+20 min)
    t.after = {};
  }
  return t;
}

function saveTally(t) {
  localStorage.setItem(TALLY_KEY, JSON.stringify(t));
}

export function getTally(duaId) {
  const t = loadTally();
  return t[bucketFor(duaId)][duaId] || 0;
}

export function bumpTally(duaId) {
  const t = loadTally();
  const bucket = bucketFor(duaId);
  t[bucket][duaId] = (t[bucket][duaId] || 0) + 1;
  saveTally(t);
  return t[bucket][duaId];
}
