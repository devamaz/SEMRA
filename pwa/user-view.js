/**
 * user-view — Renders Today, Announcements, and Notification Settings.
 *
 * Interface:
 *   init(appEl)              → void
 *   render(screen, settings) → void
 *   tick()                   → void
 */

import * as TimesData from "../shared/times-data.js";
import * as State from "../shared/state.js";
import * as Announcements from "../shared/announcements.js";
import * as Install from "./install.js";
import * as DuaData from "../shared/dua-data.js";
import * as QuranData from "../shared/quran-data.js";

let appEl = null;
let activeScreen = "today";

function wireInstallBanner(root) {
  const installBtn = root.querySelector("[data-install]");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      installBtn.disabled = true;
      await Install.promptInstall();
      // Re-render current screen so banner drops if prompt consumed
      render(null, State.getSettings());
    });
  }
  const dismissBtn = root.querySelector("[data-install-dismiss]");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      Install.dismiss();
      render(null, State.getSettings());
    });
  }
}

function buildInstallBanner() {
  const state = Install.getState();
  if (state.canPrompt) {
    const banner = el("div", "install-banner");
    banner.innerHTML =
      '<div class="install-banner-text">' +
      "<b>Install SEMRA</b>" +
      "<small>Add to your home screen for faster access and Adhan reminders.</small>" +
      "</div>" +
      '<div class="install-banner-actions">' +
      '<button type="button" class="install-btn" data-install>Install</button>' +
      '<button type="button" class="install-dismiss" data-install-dismiss aria-label="Dismiss">Not now</button>' +
      "</div>";
    return banner;
  }
  if (state.showIosTip) {
    const banner = el("div", "install-banner install-banner--ios");
    banner.innerHTML =
      '<div class="install-banner-text">' +
      "<b>Add SEMRA to Home Screen</b>" +
      "<small>Tap Share, then <em>Add to Home Screen</em> for the full app experience.</small>" +
      "</div>" +
      '<div class="install-banner-actions">' +
      '<button type="button" class="install-dismiss" data-install-dismiss aria-label="Dismiss">Got it</button>' +
      "</div>";
    return banner;
  }
  return null;
}

const SEEN_NEWS_KEY = "scm_seen_announcements";

/** Latest announcement timestamp; 0 for seed items that predate ts stamping. */
function latestAnnouncementTs(announcements) {
  return announcements.reduce((m, a) => Math.max(m, a.ts || 0), 0);
}

/** Record what the resident has seen and drop the Updates dot. */
export function markNewsSeen(announcements) {
  const latest = latestAnnouncementTs(announcements);
  if (latest > +(localStorage.getItem(SEEN_NEWS_KEY) || 0)) {
    localStorage.setItem(SEEN_NEWS_KEY, String(latest));
  }
  document
    .querySelector('.nav [data-go="news"]')
    ?.classList.remove("notif-dot");
}

/** Show the Updates dot only when an unseen announcement exists. */
export function refreshNewsDot() {
  fetch("/api/announcements")
    .then(async (res) => {
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;
      const unseen = latestAnnouncementTs(list) > +(localStorage.getItem(SEEN_NEWS_KEY) || 0);
      document
        .querySelector('.nav [data-go="news"]')
        ?.classList.toggle("notif-dot", unseen);
    })
    .catch(() => {}); // offline: leave dot as-is (SW may still show cached data)
}

function iconSvg(p) {
  let s;
  if (p.id === "fajr")
    s =
      '<path d="M12 3a5 5 0 0 0 5 5 5 5 0 0 0-5 5 5 5 0 0 0-5-5 5 5 0 0 0 5-5z"/><path d="M3 21h18"/>';
  else if (p.id === "dhuhr")
    s =
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>';
  else if (p.id === "maghrib")
    s = '<path d="M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M12 6V3"/>';
  else if (p.id === "isha")
    s = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  else s = '<path d="M3 12h18M12 3v18"/>';
  return '<svg viewBox="0 0 24 24">' + s + "</svg>";
}

function el(tag, className, innerHTML) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML) e.innerHTML = innerHTML;
  return e;
}

function renderToday(settings) {
  const container = el("div", "screen on");
  const np = TimesData.nextPrayerSlot();
  const npTime = TimesData.getTime(np.id);

  // Hero
  const hero = el("div", "hero");
  hero.innerHTML =
    '<div class="bismillah">بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div><div class="mosque-name">سنة سيتي إستيت مسجد<span class="en">Suncity Estate Mosque</span></div>';
  container.appendChild(hero);

  // Next prayer card
  const next = el("div", "next");
  next.innerHTML =
    '<div class="next-top">' +
    '<div><div class="next-label">Next Prayer</div><div class="next-name"><span id="npName">' +
    np.name +
    '</span> <span class="next-arabic next-time">· <span id="npArabic">' +
    np.arabic +
    "</span></span></div></div>" +
    '<div style="text-align:right"><div class="next-label">Time</div><div class="next-name next-time" id="npTime">' +
    npTime +
    "</div></div>" +
    "</div>" +
    '<div class="countdown"><b id="cdH">00</b><span>hrs</span><span class="sep">:</span><b id="cdM">00</b><span>min</span><span class="sep">:</span><b id="cdS">00</b><span>sec</span></div>';
  container.appendChild(next);

  const installBanner = buildInstallBanner();
  if (installBanner) {
    container.appendChild(installBanner);
    wireInstallBanner(installBanner);
  }

  // Prayer list
  const sec = el("div", "sec");
  sec.innerHTML =
    '<div class="sec-h"><h2>Today\'s Prayers</h2></div><div class="plist" id="todayList"></div>';
  container.appendChild(sec);

  const prayers = TimesData.getPrayers();
  const list = sec.querySelector("#todayList");
  prayers.forEach((p) => {
    const isNow = np && np.id === p.id;
    const row = el("div", "prow" + (isNow ? " now" : ""));
    row.innerHTML =
      '<div class="ic-ico">' +
      iconSvg(p) +
      "</div>" +
      '<div><div class="pn">' +
      p.name +
      " <small>" +
      p.arabic +
      "</small></div></div>" +
      '<div class="pt">' +
      TimesData.getTime(p.id) +
      "</div>" +
      (isNow ? '<div class="badge-now">Next</div>' : "<div></div>");
    list.appendChild(row);
  });

  // Friday
  const friSec = el("div", "sec");
  friSec.style.marginBottom = "6px";
  friSec.innerHTML = '<div class="sec-h"><h2>This Friday</h2></div>';
  container.appendChild(friSec);

  const jumuah = el("div", "jumuah");
  jumuah.innerHTML =
    '<div class="mb"><svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/></svg></div>' +
    '<div><div class="jt">Jumu\'ah Prayer</div><div class="js">Khutbah begins <span id="jukh">' +
    TimesData.getTime("khutbah") +
    "</span></div></div>" +
    '<div class="jd"><b id="juTime">' +
    TimesData.getTime("jumuah") +
    "</b><small>Iqamah</small></div>";
  container.appendChild(jumuah);

  appEl.appendChild(container);
}

function renderNews(settings) {
  const container = el("div", "screen on");

  const hd = el("div", "hd");
  hd.innerHTML =
    '<h1>Announcements</h1><p>From the mosque committee · <span id="newsCount">—</span> active</p>';
  container.appendChild(hd);

  const list = el("div", "sec");
  list.id = "newsList";
  list.style.marginTop = "14px";
  list.innerHTML =
    '<p style="text-align:center;color:var(--muted);padding:20px">Loading announcements…</p>';
  container.appendChild(list);

  appEl.appendChild(container);

  // Fetch from server (SW may serve last cached GET); fall back to localStorage
  fetch("/api/announcements")
    .then(async (res) => {
      if (!res.ok) throw new Error("announcements " + res.status);
      const announcements = await res.json();
      if (!Array.isArray(announcements)) throw new Error("bad announcements payload");
      renderAnnouncementsList(announcements);
    })
    .catch(() => {
      renderAnnouncementsList(Announcements.getAll());
    });

  function renderAnnouncementsList(announcements) {
    document.getElementById("newsCount").textContent = announcements.length;
    markNewsSeen(announcements);
    list.innerHTML = "";

    if (announcements.length === 0) {
      list.innerHTML =
        '<p style="text-align:center;color:var(--muted);padding:20px">No announcements yet.</p>';
      return;
    }

    announcements.forEach((n) => {
      const pinSvg =
        n.type === "event"
          ? '<svg viewBox="0 0 24 24"><path d="M5 21h14M7 21V9l5-5 5 5v12M10 21v-6h4v6"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M3 5h18M3 12h18M3 19h12"/></svg>';
      const a = el("div", "an " + n.type);
      a.innerHTML =
        '<div class="pin">' +
        pinSvg +
        "</div>" +
        "<div><h3>" +
        n.title +
        "</h3><p>" +
        n.body +
        "</p>" +
        '<div class="meta"><span class="tag" style="color:' +
        (n.type === "event" ? "var(--gold-d)" : "var(--deen)") +
        '">' +
        n.tag +
        "</span> · " +
        n.when +
        "</div></div>";
      list.appendChild(a);
    });
  }
}

function renderSettings(settings) {
  const container = el("div", "screen on");

  const hd = el("div", "hd");
  hd.innerHTML =
    "<h1>Notifications</h1><p>Choose what Suncity Estate Mosque reminds you of.</p>";
  container.appendChild(hd);

  // Per-prayer toggles
  const sec1 = el("div", "sec");
  sec1.style.marginTop = "14px";
  sec1.innerHTML = '<div class="setting-group" id="notifPrayers"></div>';
  container.appendChild(sec1);

  const prayers = TimesData.getPrayers();
  const notifBox = sec1.querySelector("#notifPrayers");
  prayers.forEach((p) => {
    const on = settings.notif[p.id];
    const row = el("div", "set-row");
    row.innerHTML =
      '<div class="lab"><b>' +
      p.name +
      " (Adhan)</b><small>" +
      p.arabic +
      " · " +
      p.note +
      "</small></div>" +
      '<div class="switch ' +
      (on ? "on" : "") +
      '"></div>';
    row
      .querySelector(".switch")
      .addEventListener("click", () => State.togglePrayerNotif(p.id));
    notifBox.appendChild(row);
  });

  // Reminder offset
  const sec2 = el("div", "sec");
  sec2.innerHTML =
    '<div class="setting-group">' +
    '<div class="set-row"><div class="lab"><b>Reminder before each prayer</b><small>How early to notify you</small></div></div>' +
    '<div class="set-row" style="display:block"><div class="seg" id="remindSeg">' +
    '<button data-min="0">On time</button>' +
    '<button data-min="5">5 min</button>' +
    '<button data-min="10">10 min</button>' +
    '<button data-min="15">15 min</button>' +
    "</div></div>" +
    "</div>";
  container.appendChild(sec2);

  sec2.querySelectorAll("#remindSeg button").forEach((b) => {
    b.classList.toggle("sel", +b.dataset.min === settings.remind);
    b.addEventListener("click", () => State.setReminderOffset(+b.dataset.min));
  });

  // Jumu'ah + announcements toggles
  const sec3 = el("div", "sec");
  sec3.innerHTML =
    '<div class="setting-group">' +
    '<div class="set-row">' +
    '<div class="lab"><b>Jumu\'ah reminder</b><small>Friday · 30 min before khutbah</small></div>' +
    '<div class="switch ' +
    (settings.jumuah ? "on" : "") +
    '" id="swJumuah"></div>' +
    "</div>" +
    '<div class="set-row">' +
    '<div class="lab"><b>New announcements</b><small>When the committee posts</small></div>' +
    '<div class="switch ' +
    (settings.news ? "on" : "") +
    '" id="swNews"></div>' +
    "</div>" +
    "</div>";
  container.appendChild(sec3);

  sec3
    .querySelector("#swJumuah")
    .addEventListener("click", () => State.toggleJumuah());
  sec3
    .querySelector("#swNews")
    .addEventListener("click", () => State.toggleNews());

  // Install app (Chromium prompt or iOS tip)
  const installState = Install.getState();
  if (!installState.installed) {
    const secInstall = el("div", "sec");
    if (installState.canPrompt || (!installState.dismissed && installState.showIosTip)) {
      const banner = buildInstallBanner();
      if (banner) {
        banner.classList.add("install-banner--settings");
        secInstall.appendChild(banner);
        wireInstallBanner(banner);
      }
    } else if (installState.dismissed) {
      secInstall.innerHTML =
        '<div class="setting-group">' +
        '<div class="set-row">' +
        '<div class="lab"><b>Install SEMRA</b><small>Add the app to your home screen</small></div>' +
        '<button type="button" class="install-btn install-btn--compact" data-install-show>Show</button>' +
        "</div></div>";
      secInstall
        .querySelector("[data-install-show]")
        ?.addEventListener("click", () => {
          Install.clearDismiss();
          render("settings", State.getSettings());
        });
    } else {
      // Waiting for beforeinstallprompt — still offer context
      secInstall.innerHTML =
        '<div class="setting-group">' +
        '<div class="set-row">' +
        '<div class="lab"><b>Install SEMRA</b><small>Use the browser install icon when it appears, or open on Chrome/Edge for a one-tap install.</small></div>' +
        "</div></div>";
    }
    if (secInstall.childNodes.length) container.appendChild(secInstall);
  }

  const foot = el("div", "sec");
  foot.style.marginTop = "4px";
  foot.style.marginBottom = "10px";
  foot.innerHTML =
    '<p style="font-size:12px;color:var(--muted)">Suncity Estate Mosque · app v1.0 · "Indeed, prayer is on the believers at prescribed times." (4:103)</p>';
  container.appendChild(foot);

  appEl.appendChild(container);
}

// ── Du'a & Adhkār ──

let duaSegment = "after";

function renderDua() {
  appEl.innerHTML = "";
  const container = el("div", "screen on");

  const hd = el("div", "hd");
  hd.innerHTML =
    '<h1>Du\'a & Adhkār</h1><p>Supplications for morning, evening, and after every ṣalāh.</p>';
  container.appendChild(hd);

  const segSec = el("div", "sec");
  segSec.style.marginTop = "14px";
  segSec.innerHTML = '<div class="seg" id="duaSeg"></div>';
  container.appendChild(segSec);

  const segBox = segSec.querySelector("#duaSeg");
  DuaData.getSegments().forEach((s) => {
    const b = el("button", s.id === duaSegment ? "sel" : "");
    b.textContent = s.label;
    b.dataset.v = s.id;
    b.addEventListener("click", () => {
      duaSegment = s.id;
      renderDua();
    });
    segBox.appendChild(b);
  });

  const listSec = el("div", "sec");
  listSec.style.marginTop = "4px";
  container.appendChild(listSec);

  DuaData.getDuas(duaSegment).forEach((d) => {
    const count = DuaData.getTally(d.id);
    const done = count >= d.n;
    const card = el(
      "div",
      "dua-card tap" + (done ? " done" : "")
    );
    card.setAttribute("role", "button");
    card.innerHTML =
      '<div class="ar">' +
      d.ar +
      '</div><div class="tr">' +
      d.tr +
      '</div><div class="cnt"><em>×</em> <span class="tally">' +
      Math.min(count, d.n) +
      " / " +
      d.n +
      "</span></div>";
    card.addEventListener("click", () => {
      if (DuaData.getTally(d.id) >= d.n) return;
      const c = DuaData.bumpTally(d.id);
      const chip = card.querySelector(".cnt");
      chip.querySelector(".tally").textContent = Math.min(c, d.n) + " / " + d.n;
      chip.classList.add("bump");
      setTimeout(() => chip.classList.remove("bump"), 180);
      if (c >= d.n) card.classList.add("done");
    });
    listSec.appendChild(card);
  });

  const foot = el("div", "sec");
  foot.style.marginTop = "4px";
  foot.style.marginBottom = "10px";
  foot.innerHTML =
    '<p style="font-size:12px;color:var(--muted);line-height:1.55">These are from the authenticated Sunnah. Tap a card each time you repeat it to keep count — Morning and Evening tallies reset daily; After Ṣalāh tallies reset 20 minutes after each prayer.</p>';
  container.appendChild(foot);

  appEl.appendChild(container);
}

// ── Qur'an player ──
// Audio lives outside the DOM so recitation continues while the resident
// browses other tabs; playback itself is online-only (ADR-0008).

const player = { audio: null, idx: 0, playing: false, seekingReciter: null };

function fmt(s) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return m + ":" + (ss < 10 ? "0" : "") + ss;
}

function playerAudio() {
  if (!player.audio) {
    player.audio = new Audio();
    player.audio.preload = "none";
    player.audio.addEventListener("timeupdate", updatePlayerUi);
    player.audio.addEventListener("loadedmetadata", updatePlayerUi);
    player.audio.addEventListener("ended", nextSurah);
    player.audio.addEventListener("play", () => setPlaying(true));
    player.audio.addEventListener("pause", () => setPlaying(false));
    player.audio.addEventListener("error", showStreamError);
  }
  return player.audio;
}

function setPlaying(on) {
  player.playing = on;
  updatePlayerUi();
}

function showStreamError() {
  const err = document.getElementById("qpErr");
  if (err)
    err.textContent =
      "Could not load the recitation — check your internet connection and try again.";
}

function playSurah(i) {
  const suras = QuranData.getSuras();
  player.idx = ((i % suras.length) + suras.length) % suras.length;
  const surah = suras[player.idx];
  const reciterId = QuranData.getPreferredReciter();
  const audio = playerAudio();
  const err = document.getElementById("qpErr");
  if (err) err.textContent = "";
  audio.src = QuranData.getAudioUrl(surah.n, reciterId);
  audio.play().catch(() => {});
  updateMediaSession(surah, reciterId);
  const qpSurah = document.getElementById("qpSurah");
  if (qpSurah) {
    qpSurah.textContent = surah.name;
    document.getElementById("qpAr").textContent = surah.ar;
  }
  updatePlayerUi();
}

function togglePlay() {
  const audio = playerAudio();
  if (!audio.src) {
    playSurah(player.idx);
    return;
  }
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function nextSurah() {
  playSurah(player.idx + 1);
}

function prevSurah() {
  playSurah(player.idx - 1);
}

function switchReciter(id) {
  QuranData.setPreferredReciter(id);
  if (player.audio && player.audio.src) {
    // Reload current surah with the new voice, keeping play state.
    const wasPlaying = !player.audio.paused;
    const surah = QuranData.getSuras()[player.idx];
    player.audio.src = QuranData.getAudioUrl(surah.n, id);
    if (wasPlaying) player.audio.play().catch(() => {});
  }
  renderQuranScreen();
}

function updateMediaSession(surah, reciterId) {
  if (!("mediaSession" in navigator)) return;
  const reciter = QuranData.getReciters().find((r) => r.id === reciterId);
  navigator.mediaSession.metadata = new MediaMetadata({
    title: surah.name,
    artist: reciter ? reciter.name : "",
    album: "The Holy Qur'an",
  });
  navigator.mediaSession.setActionHandler("play", togglePlay);
  navigator.mediaSession.setActionHandler("pause", togglePlay);
  navigator.mediaSession.setActionHandler("previoustrack", prevSurah);
  navigator.mediaSession.setActionHandler("nexttrack", nextSurah);
}

/** Update progress/times/list highlights if the Qur'an screen is visible. */
function updatePlayerUi() {
  const bar = document.getElementById("qpBar");
  if (!bar) return; // not on the Quran screen right now
  const audio = player.audio || {};
  const pos = audio.currentTime || 0;
  const dur = audio.duration;
  document.getElementById("qpPos").textContent = fmt(pos);
  document.getElementById("qpDur").textContent = fmt(dur);
  bar.style.width = dur ? (pos / dur) * 100 + "%" : "0%";
  document.querySelectorAll("#surahList .srow").forEach((row, i) => {
    row.classList.toggle("playing", i === player.idx);
    row.classList.toggle("active", i === player.idx);
    const eq = row.querySelector(".eq");
    if (eq) eq.style.display = i === player.idx && player.playing ? "flex" : "none";
    const durEl = row.querySelector(".dur");
    if (durEl) {
      const isCur = i === player.idx;
      const haveDur = isCur && audio.duration && isFinite(audio.duration);
      durEl.style.display = haveDur ? "block" : "none";
      if (haveDur) durEl.textContent = fmt(audio.duration);
    }
  });
  const playBtn = document.getElementById("qpPlay");
  if (playBtn)
    playBtn.innerHTML = player.playing
      ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
}

function renderQuranScreen() {
  appEl.innerHTML = "";
  const container = el("div", "screen on");
  const suras = QuranData.getSuras();
  const reciters = QuranData.getReciters();
  const cur = suras[player.idx];
  const reciterName =
    (reciters.find((r) => r.id === QuranData.getPreferredReciter()) || {}).name ||
    "";

  const hd = el("div", "hd");
  hd.innerHTML =
    '<h1>The Holy Qur\'an</h1><p>Listen to recitation · streaming needs an internet connection</p>';
  container.appendChild(hd);

  const qp = el("div", "qp");
  qp.innerHTML =
    '<button type="button" class="reciter-btn" id="reciterBtn">Now Playing · ' +
    reciterName +
    '</button>' +
    '<div class="surah-name" id="qpSurah">' +
    cur.name +
    '</div><div class="surah-ar" id="qpAr">' +
    cur.ar +
    '</div><div class="progress"><div class="bar" id="qpBar"></div></div>' +
    '<div class="times"><span id="qpPos">0:00</span><span id="qpDur">0:00</span></div>' +
    '<p class="qp-err" id="qpErr"></p>' +
    '<div class="ctrls">' +
    '<button id="qpPrev" aria-label="Previous surah"><svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zM20 6v12l-9-6z"/></svg></button>' +
    '<button class="play" id="qpPlay" aria-label="Play or pause"></button>' +
    '<button id="qpNext" aria-label="Next surah"><svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM4 6v12l9-6z"/></svg></button>' +
    "</div>";
  container.appendChild(qp);

  qp.querySelector("#qpPlay").addEventListener("click", togglePlay);
  qp.querySelector("#qpPrev").addEventListener("click", prevSurah);
  qp.querySelector("#qpNext").addEventListener("click", nextSurah);
  qp.querySelector("#reciterBtn").addEventListener("click", openReciterSheet);

  const listSec = el("div", "sec");
  listSec.style.marginTop = "16px";
  listSec.innerHTML =
    '<div class="sec-h"><h2>Surahs</h2></div><div class="surah-list" id="surahList"></div>';
  container.appendChild(listSec);

  const list = listSec.querySelector("#surahList");
  suras.forEach((s, i) => {
    const row = el("div", "srow" + (i === player.idx ? " playing active" : ""));
    row.innerHTML =
      '<div class="num">' +
      s.n +
      '</div><div class="nm">' +
      s.name +
      " <small>" +
      s.ar +
      '</small></div>' +
      '<div class="dur" style="display:none"></div>' +
      '<div class="eq" style="display:none"><i></i><i></i><i></i></div>';
    row.addEventListener("click", () => playSurah(i));
    list.appendChild(row);
  });

  appEl.appendChild(container);
  updatePlayerUi();
}

function openReciterSheet() {
  const sheet = el("div", "sheet on");
  sheet.id = "reciterSheet";
  const current = QuranData.getPreferredReciter();
  let rows = "";
  QuranData.getReciters().forEach((r) => {
    rows +=
      '<div class="set-row" style="cursor:pointer" data-rec="' +
      r.id +
      '"><div class="lab"><b>' +
      r.name +
      '</b></div><span class="tick" style="visibility:' +
      (r.id === current ? "visible" : "hidden") +
      '">✓</span></div>';
  });
  sheet.innerHTML =
    '<div class="sheet-bg"></div>' +
    '<div class="sheet-card"><div class="sheet-grip"></div>' +
    "<h3>Reciter</h3>" +
    '<div class="sub">Choose the voice for recitation</div>' +
    '<div class="setting-group" style="margin-top:16px">' +
    rows +
    "</div></div>";
  document.querySelector(".phone").appendChild(sheet);

  function close() {
    sheet.remove();
  }
  sheet.querySelector(".sheet-bg").addEventListener("click", close);
  sheet.querySelectorAll("[data-rec]").forEach((row) => {
    row.addEventListener("click", () => {
      switchReciter(row.dataset.rec);
      close();
    });
  });
}

function renderQuran() {
  renderQuranScreen();
}

// ── Public interface ──

export function init(_appEl) {
  appEl = _appEl;
}

export function render(screen, settings) {
  if (screen) activeScreen = screen;
  appEl.innerHTML = "";

  switch (activeScreen) {
    case "today":
      renderToday(settings);
      break;
    case "news":
      renderNews(settings);
      break;
    case "dua":
      renderDua(settings);
      break;
    case "quran":
      renderQuran(settings);
      break;
    case "settings":
      renderSettings(settings);
      break;
  }
}

export function tick() {
  const cdH = document.getElementById("cdH");
  if (!cdH) return;

  const np = TimesData.nextPrayerSlot();
  if (!np) return;

  const now = new Date();
  const t = TimesData.to24(TimesData.getTime(np.id));
  const target = new Date(now);
  target.setHours(t.h, t.m, 0, 0);

  let diff = target - now;
  if (diff < 0) diff += 86400000;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  cdH.textContent = (h < 10 ? "0" : "") + h;
  const cdM = document.getElementById("cdM");
  if (cdM) cdM.textContent = (m < 10 ? "0" : "") + m;
  const cdS = document.getElementById("cdS");
  if (cdS) cdS.textContent = (s < 10 ? "0" : "") + s;
}
