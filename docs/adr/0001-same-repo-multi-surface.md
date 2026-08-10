# Same repo, separate surface folders

SEMRA is a solo-maintained product with three user surfaces (landing site, user PWA, admin panel) and one backend that owns Prayer times and announcements. Keep everything in one repository with clear folder boundaries (`landing/`, `pwa/`, `admin/`, `shared/`, `server/`, `data/`), not separate repos and not a flat root forever.

Routes: `/` landing, `/app/` PWA, `/admin/` admin, `/shared/` cross-surface assets, `/api/*` backend.

**Why:** Shared domain (Prayer time, Announcement, Schedule update) and one deployable Node server already serve static files and `/api/*`. Multi-repo would double wiring with no team boundary to justify it. A marketing landing that shows today's times must call the same `/api/times` as the PWA — co-locating prevents drift. `shared/` holds times-data, state, announcements, and app styles used by PWA and admin.

**Rejected:** Separate repos per surface; micro-frontends; keeping all HTML/JS at repo root as a third surface is added.
