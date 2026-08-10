# Server owns Prayer times; push on Schedule update

Prayer times are canonical on the server (`/api/times`). Clients cache for offline only. When an admin saves a Schedule update, the server sends a web push to subscribers describing the change. UI freshness is "next open/refresh" — no live socket required.

**Why:** Residents must not see different Maghrib times on two phones. Push answers "how do I know it changed?" without building realtime sync. Solo maintainer; JSON file backend is enough until write contention or multi-mosque appears.

**Rejected:** Per-device localStorage as source of truth; CRDT/offline admin edit merge; WebSocket live clocks for all open tabs.
