/**
 * quran-data — Surah index, Reciters, and CDN audio URLs.
 *
 * Qur'an audio streams from the public islamic.network CDN, keyed by
 * Surah number and Reciter ID (see docs/adr/0008). Nothing is stored
 * on the SEMRA server and playback requires an internet connection.
 *
 * Interface:
 *   getSuras()               → [{n, name, ar}]
 *   getReciters()            → [{id, name}]
 *   getAudioUrl(surahN, reciterId) → url
 *   getPreferredReciter()    → reciterId
 *   setPreferredReciter(id)  → void
 */

const RECITER_KEY = "scm_reciter";

// Only these recitation IDs are actually served by the CDN's surah-level
// endpoint (verified); other well-known IDs return 403.
export const RECITERS = [
  { id: "ar.alafasy", name: "Mishary Alafasy" },
  { id: "ar.abdulbasitmurattal", name: "Abdul Basit Murattal" },
  { id: "ar.abdullahbasfar", name: "Abdullah Basfar" },
];

// [number, transliterated name, Arabic name]
const SURAS = [
  [1, "Al-Fatihah", "الفاتحة"],
  [2, "Al-Baqarah", "البقرة"],
  [3, "Aal Imran", "آل عمران"],
  [4, "An-Nisa", "النساء"],
  [5, "Al-Ma'idah", "المائدة"],
  [6, "Al-An'am", "الأنعام"],
  [7, "Al-A'raf", "الأعراف"],
  [8, "Al-Anfal", "الأنفال"],
  [9, "At-Tawbah", "التوبة"],
  [10, "Yunus", "يونس"],
  [11, "Hud", "هود"],
  [12, "Yusuf", "يوسف"],
  [13, "Ar-Ra'd", "الرعد"],
  [14, "Ibrahim", "ابراهيم"],
  [15, "Al-Hijr", "الحجر"],
  [16, "An-Nahl", "النحل"],
  [17, "Al-Isra", "الإسراء"],
  [18, "Al-Kahf", "الكهف"],
  [19, "Maryam", "مريم"],
  [20, "Taha", "طه"],
  [21, "Al-Anbiya", "الأنبياء"],
  [22, "Al-Hajj", "الحج"],
  [23, "Al-Mu'minun", "المؤمنون"],
  [24, "An-Nur", "النور"],
  [25, "Al-Furqan", "الفرقان"],
  [26, "Ash-Shu'ara", "الشعراء"],
  [27, "An-Naml", "النمل"],
  [28, "Al-Qasas", "القصص"],
  [29, "Al-Ankabut", "العنكبوت"],
  [30, "Ar-Rum", "الروم"],
  [31, "Luqman", "لقمان"],
  [32, "As-Sajdah", "السجدة"],
  [33, "Al-Ahzab", "الأحزاب"],
  [34, "Saba", "سبأ"],
  [35, "Fatir", "فاطر"],
  [36, "Ya-Sin", "يس"],
  [37, "As-Saffat", "الصافات"],
  [38, "Sad", "ص"],
  [39, "Az-Zumar", "الزمر"],
  [40, "Ghafir", "غافر"],
  [41, "Fussilat", "فصلت"],
  [42, "Ash-Shura", "الشورى"],
  [43, "Az-Zukhruf", "الزخرف"],
  [44, "Ad-Dukhan", "الدخان"],
  [45, "Al-Jathiyah", "الجاثية"],
  [46, "Al-Ahqaf", "الأحقاف"],
  [47, "Muhammad", "محمد"],
  [48, "Al-Fath", "الفتح"],
  [49, "Al-Hujurat", "الحجرات"],
  [50, "Qaf", "ق"],
  [51, "Adh-Dhariyat", "الذاريات"],
  [52, "At-Tur", "الطور"],
  [53, "An-Najm", "النجم"],
  [54, "Al-Qamar", "القمر"],
  [55, "Ar-Rahman", "الرحمن"],
  [56, "Al-Waqi'ah", "الواقعة"],
  [57, "Al-Hadid", "الحديد"],
  [58, "Al-Mujadila", "المجادلة"],
  [59, "Al-Hashr", "الحشر"],
  [60, "Al-Mumtahanah", "الممتحنة"],
  [61, "As-Saff", "الصف"],
  [62, "Al-Jumu'ah", "الجمعة"],
  [63, "Al-Munafiqun", "المنافقون"],
  [64, "At-Taghabun", "التغابن"],
  [65, "At-Talaq", "الطلاق"],
  [66, "At-Tahrim", "التحريم"],
  [67, "Al-Mulk", "الملك"],
  [68, "Al-Qalam", "القلم"],
  [69, "Al-Haqqah", "الحاقة"],
  [70, "Al-Ma'arij", "المعارج"],
  [71, "Nuh", "نوح"],
  [72, "Al-Jinn", "الجن"],
  [73, "Al-Muzzammil", "المزمل"],
  [74, "Al-Muddaththir", "المدثر"],
  [75, "Al-Qiyamah", "القيامة"],
  [76, "Al-Insan", "الإنسان"],
  [77, "Al-Mursalat", "المرسلات"],
  [78, "An-Naba", "النبأ"],
  [79, "An-Nazi'at", "النازعات"],
  [80, "Abasa", "عبس"],
  [81, "At-Takwir", "التكوير"],
  [82, "Al-Infitar", "الإنفطار"],
  [83, "Al-Mutaffifin", "المطففين"],
  [84, "Al-Inshiqaq", "الإنشقاق"],
  [85, "Al-Buruj", "البروج"],
  [86, "At-Tariq", "الطارق"],
  [87, "Al-A'la", "الأعلى"],
  [88, "Al-Ghashiyah", "الغاشية"],
  [89, "Al-Fajr", "الفجر"],
  [90, "Al-Balad", "البلد"],
  [91, "Ash-Shams", "الشمس"],
  [92, "Al-Layl", "الليل"],
  [93, "Ad-Duha", "الضحى"],
  [94, "Ash-Sharh", "الشرح"],
  [95, "At-Tin", "التين"],
  [96, "Al-Alaq", "العلق"],
  [97, "Al-Qadr", "القدر"],
  [98, "Al-Bayyinah", "البينة"],
  [99, "Az-Zalzalah", "الزلزلة"],
  [100, "Al-Adiyat", "العاديات"],
  [101, "Al-Qari'ah", "القارعة"],
  [102, "At-Takathur", "التكاثر"],
  [103, "Al-Asr", "العصر"],
  [104, "Al-Humazah", "الهمزة"],
  [105, "Al-Fil", "الفيل"],
  [106, "Quraysh", "قريش"],
  [107, "Al-Ma'un", "الماعون"],
  [108, "Al-Kawthar", "الكوثر"],
  [109, "Al-Kafirun", "الكافرون"],
  [110, "An-Nasr", "النصر"],
  [111, "Al-Masad", "المسد"],
  [112, "Al-Ikhlas", "الإخلاص"],
  [113, "Al-Falaq", "الفلق"],
  [114, "An-Nas", "الناس"],
].map(([n, name, ar]) => ({ n, name, ar }));

export function getSuras() {
  return SURAS;
}

export function getReciters() {
  return RECITERS;
}

/**
 * Per-surah MP3 from the public islamic.network CDN (128 kbps).
 */
export function getAudioUrl(surahN, reciterId) {
  return (
    "https://cdn.islamic.network/quran/audio-surah/128/" +
    encodeURIComponent(reciterId) +
    "/" +
    surahN +
    ".mp3"
  );
}

export function getPreferredReciter() {
  const id = localStorage.getItem(RECITER_KEY);
  return RECITERS.some((r) => r.id === id) ? id : RECITERS[0].id;
}

export function setPreferredReciter(id) {
  if (RECITERS.some((r) => r.id === id)) localStorage.setItem(RECITER_KEY, id);
}
