# Events are a separate resource from Announcements

Calendar Events (title, description, tag, date, time, location) live in `data/events.json` and `/api/events`. Announcements remain news/push items. The public Events page and homepage strip read Events only; admin manages them on a dedicated Events tab. Optional web push on save is a checkbox, not automatic.

**Why:** Announcement `type: event` was a label on a blast, not a schedule. Mixing them made edit/delete and the public calendar unreliable.

**Rejected:** Reusing announcements with extra date fields; one merged content feed.
