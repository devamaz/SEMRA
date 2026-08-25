# SEMRA — Domain Glossary

Public-facing identity and shared language for Suncity Estate Mosque residents' association digital surfaces (landing site, prayer PWA, admin).

## Identity

**SEMRA**:
The public name of the organisation and product. Primary brand on the landing site and PWA.
_Avoid_: Leading with "Suncity Estate Mosque" alone; treating SEMRA as an internal codename only

**Suncity Estate Mosque**:
The physical mosque SEMRA serves. Secondary / legal name under SEMRA.
_Avoid_: Using as the sole product name on new surfaces

## Prayer schedule

**Prayer**:
One of the five daily obligatory prayers (Salaah): Fajr, Dhuhr, Asr, Maghrib, Isha. Each has an Arabic name, an English name, and a scheduled time.
_Avoid_: Salah spelling variants in UI copy unless matching existing Arabic presentation

**Prayer time**:
The scheduled clock time for a Prayer at Suncity Estate Mosque. Canonical value lives on the server; client devices may cache a copy for offline use but never override the server when online. Manually set estimates (not astronomically calculated); adjusted as seasons change.
_Avoid_: Per-device time, local-only schedule, device-owned schedule

**Schedule update**:
An admin change to one or more Prayer times (or Jumu'ah / Khutbah times) on the server. Residents are notified of the change; open clients pick up new times on the next load or refresh.
_Avoid_: Sync conflict, merge, local edit

**Jumu'ah**:
The Friday congregational prayer that replaces Dhuhr on Fridays. Has two associated times: Khutbah start and Iqamah.
_Avoid_: Friday prayer (as a separate domain object from Jumu'ah)

**Khutbah**:
The sermon delivered before the Jumu'ah prayer.
_Avoid_: Sermon (in schedule/UI language)

**Iqamah**:
The call that signals the prayer congregation is about to begin. For Jumu'ah, this follows the Khutbah.

**Adhan**:
The call to prayer. The PWA can remind users at each Adhan time when notification settings allow.
_Avoid_: Athan, azan (in code and primary UI strings)

**Adhan reminder**:
A server-sent push that a Subscriber receives at Prayer time minus their Reminder offset, when that Prayer's Notification setting is on. On Fridays, Dhuhr has no Adhan reminder; Jumu'ah reminder applies instead.
_Avoid_: Local alarm, device timer, prayer alarm (as the product mechanism)

**Jumu'ah reminder**:
A server-sent push 30 minutes before Khutbah on Fridays when the Subscriber's Jumu'ah Notification setting is on. Replaces the Dhuhr Adhan reminder for that day whether or not Dhuhr is toggled on.
_Avoid_: Friday Dhuhr reminder; using Reminder offset for Jumu'ah

**Mosque local time**:
The civil timezone in which Prayer times are interpreted and Adhan reminders are fired: Africa/Lagos (West Africa Time). Wall-clock strings like "6:32 PM" mean that zone, not the device's zone and not bare UTC.
_Avoid_: Server host timezone, device timezone, floating local time

## Communications

**Event**:
A scheduled community gathering or programme (Eid prayer, halaqah, academy term, lecture). Has title, description, tag, start date, time, and location. Canonical on the server; shown on the landing Events page and homepage strip.
_Avoid_: Announcement, post, calendar item (prefer Event)

**Announcement**:
A news item or push blast from the mosque committee. Has a type (event-labelled notice or general notice), title, body, tag, and relative timestamp. Not a substitute for a scheduled Event.
_Avoid_: Post, article, blast; using Announcement as the public events calendar

**Notification setting**:
A Subscriber's choices for what they receive: per-Prayer Adhan reminder toggles, Reminder offset, Jumu'ah reminder on/off, and committee message (announcements and optional Event pushes) on/off. Separate from Schedule update pushes, which are not user-filterable.
_Avoid_: Preference pack, alert config, notification profile

**Reminder offset**:
Minutes before a Prayer time that an Adhan reminder fires. Options: on time (0), 5, 10, 15. Does not apply to Jumu'ah reminder (fixed 30 minutes before Khutbah).

**Subscriber**:
One browser or installed User app endpoint the mosque can push to, plus that endpoint's Notification settings. There is no resident login; the push endpoint is the identity.
_Avoid_: User account, notification profile, device user

**Committee message**:
A push initiated by the committee (Announcement blast or optional notify-on-save for an Event). Delivered only to Subscribers who have committee messages enabled. Not an Adhan reminder; not a Schedule update.
_Avoid_: Calling these Adhan; treating Event optional push as a separate opt-in from announcements

## Media

**Video**:
A public upload to the SEMRA YouTube channel — a Jumu'ah khutbah, Taraweeh, Tahajjud, khatm, or event recording. Canonical source is YouTube; the landing Videos page mirrors the channel's uploads and never stores them.
_Avoid_: media, post, recording (as the canonical term for an upload)

**Latest video**:
The most recently published Video on the SEMRA YouTube channel. Featured at the top of the landing Videos page; updates automatically whenever the committee uploads.
_Avoid_: Featured video of the week, newest upload (keep one term)

**SEMRA YouTube channel**:
The committee-managed YouTube channel (@semra-suncity) where khutbahs and Qur'an programmes are published. The public source of truth for Videos.
_Avoid_: Calling the landing Videos page the channel; calling it the media account

**Academy gallery**:
The photos and videos of academy life shown on the public Academy page, between the Enrol section and the footer. Newest first. Committee-managed from the admin panel; metadata lives in the Academy record.
_Avoid_: Calling the Videos page a gallery; calling khutbahs academy gallery items

**Academy photo**:
A picture of academy activity (a class, outing, or event) uploaded by the committee and stored as a file on the SEMRA server, shown in the Academy gallery. Optional caption and date.
_Avoid_: Event photo, random image; treating gallery photos as Event content

**Academy video**:
A YouTube-hosted recording of academy activity. The Academy gallery stores only its link — never the file — and the page plays it in a click-to-play lightbox embed. Distinct from Video, which is auto-mirrored from the channel feed.
_Avoid_: Calling a gallery link a Video; uploading video files to the SEMRA server

## Surfaces

**Landing site**:
The public marketing website for SEMRA. About, Events, location/contact, and today's Prayer times. Not installable; not the full prayer tool.
_Avoid_: Homepage-as-app, marketing PWA

**User app**:
The installable PWA for residents: Today (countdown + schedule), Updates (announcements), Du'a & Adhkār, Qur'an listening, and personal notification settings.
_Avoid_: Calling the landing site the app

## Worship content

**Du'a**:
A supplication from the authenticated Sunnah shown on the User app, with Arabic text, English translation, and a target repetition count. Content ships with the app bundle; the committee does not author or edit it.
_Avoid_: Treating a Du'a as an Announcement or committee-managed content

**Adhkār segment**:
One of three curated groupings of Du'as in the User app: Morning, Evening, and After Ṣalāh.
_Avoid_: Daily Adhkār (superseded grouping)

**Dhikr tally**:
The resident's per-Du'a count of repetitions made today, tracked by tapping the card. Morning and Evening tallies reset at the start of each day (Mosque local time); After Ṣalāh tallies reset 20 minutes after each Prayer. Tallies are never synced or stored server-side.
_Avoid_: Tasbih counter (as a product term), saved streaks, cross-device counts

**Surah**:
A chapter of the Qur'an. The User app's player lists all 114; row labels show number and name, not duration.
_Avoid_: Track, song, file (in UI language)

**Reciter**:
The voice chosen for Qur'an recitation in the User app. One fixed set of well-known reciters; the resident's choice is a local preference on the device and is separate from Notification settings.
_Avoid_: Qari, artist, channel (in UI language); storing Reciter choice in server settings

**Qur'an audio**:
Recitation streamed on demand from a public third-party CDN, identified by Surah and Reciter. Never uploaded to, stored on, or proxied through the SEMRA server; playback requires an internet connection.
_Avoid_: Self-hosting audio files; treating Qur'an audio like Academy gallery media

**Admin panel**:
Committee-only surface to edit the Prayer schedule, manage Events, send announcements, and manage notification broadcasts.
_Avoid_: CMS, dashboard (unless speaking generically)
