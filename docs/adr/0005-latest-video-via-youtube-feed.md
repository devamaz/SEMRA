# Latest video served from the YouTube channel feed via a keyless server proxy

The landing Videos page (`/videos.html`) always shows the most recent upload from the SEMRA YouTube channel. Browsers cannot read YouTube's feed directly (no CORS headers), so the server fetches the channel's public RSS feed (`youtube.com/feeds/videos.xml?channel_id=UC50v62zvv3BGvjeFofSYx_A` — no API key, no quota), parses the ~15 most recent uploads, caches them in-process for ~10 minutes, and exposes them at `GET /api/videos` as `{ channel, latest, recent }`. When YouTube is unreachable, the server serves the last good cache instead of failing.

**Why:** A keyless feed delivers the Latest video with zero credential management and zero quota risk, at the cost of only ~15 recent items and no search — plenty for a khutbah archive.

**Rejected:** YouTube Data API v3 — richer metadata and more items, but needs an API key, quota budgeting, and secret handling on the server for a single page's needs. A fixed video embed — works today but stops being "the latest" the moment a new video is uploaded.
