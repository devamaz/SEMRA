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
    '<div class="countdown"><b id="cdH">00</b><span>hrs</span><span class="sep">:</span><b id="cdM">00</b><span>min</span><span class="sep">:</span><b id="cdS">00</b><span>sec</span></div>' +
    '<div class="next-foot"><span class="dot"></span> <span id="npFoot">in 0m</span></div>';
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

  let foot = "in " + (h > 0 ? h + "h " : "") + m + "m";
  if (now.getDay() === 5)
    foot += " · Jumu'ah khutbah at " + TimesData.getTime("khutbah");

  const npFoot = document.getElementById("npFoot");
  if (npFoot) npFoot.textContent = foot;
}
