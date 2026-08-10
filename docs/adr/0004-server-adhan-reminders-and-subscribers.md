# Server fires Adhan reminders; Subscribers carry Notification settings

Adhan reminders and Jumu'ah reminders are sent by the server as web push, not scheduled on the device. Each push endpoint is a **Subscriber** record: browser subscription credentials plus Notification settings (per-Prayer toggles, Reminder offset, Jumu'ah, committee messages). The User app PATCHes settings on every change after subscribe.

**Delivery rules:** Adhan reminders honour prayer toggles and offset in Mosque local time (`Africa/Lagos`). On Fridays Jumu'ah reminder (Khutbah − 30 minutes) replaces Dhuhr entirely — Dhuhr on + Jumu'ah off means no midday push. Committee messages (Announcement blasts and optional Event notify) honour the news/committee toggle. Schedule update pushes always go to every Subscriber. Late Adhan/Jumu'ah reminders are skipped (only fire inside a short freshness window); a per-day sent-log prevents double fire across ticks and restarts. Bare legacy subscriptions without settings receive the same defaults as a fresh User app.

**Why:** Closed-app reliability matters more than offline-local alarms for a mosque reminder; iOS/Android will not reliably run SW timers. Server already owns Prayer times (ADR 0002) and push, so the clock job belongs there. Full settings on the Subscriber are required to filter Adhan and committee messages without inventing accounts.

**Rejected:** Device-only or hybrid local scheduling as source of truth; prefs only at subscribe time; filtering Schedule updates; Dhuhr fallback when Jumu'ah is off; catch-up pushes long after Adhan; separate Event opt-in toggle.
