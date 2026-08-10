# Deployment

SEMRA is one Node server (Express 5) that serves the landing site, the prayer
PWA, the admin panel, and the API. It has no database — state lives in JSON
files under `data/`.

## Requirements

- **Node.js 18+** (Express 5 and the code use modern ESM/Web APIs)
- **A public HTTPS origin** — see below, this is not optional
- `npm install` then `npm start` (port from `PORT`, default `8080`)

## HTTPS is mandatory — not a preference

Service workers, push notifications, and the install prompt only work in a
secure context. Over plain `http://` (other than `localhost`), the PWA silently
degrades to a normal website:

- no offline shell (`navigator.serviceWorker` is unavailable)
- no adhan/Jumu'ah push reminders
- no install button / `beforeinstallprompt`

The server itself speaks plain HTTP. Put it behind one of:

**Caddy (simplest — automatic TLS):**
```
suncity.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

**nginx + certbot:**
```
server_name suncity.example.com;
location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }
```

**Cloudflare Tunnel (no open port, free TLS):**
```
cloudflared tunnel --url http://localhost:8080
```

Any of these terminate TLS in front of the Node server; nothing in the app
changes.

## Web push keys (VAPID)

Keys live in `server/push.js` and are committed on purpose (the public key is
embedded in `pwa/main.js`; the private key must reach the server). If you ever
regenerate them, do it on the server and update **both** files:

```
npx web-push generate-vapid-keys
```

and keep the `mailto:` contact address in `setVapidDetails` valid.

## Data & persistence

Everything the app knows is in `data/*.json` (times, subscribers,
announcements, events, academy, adhan send-log). Back it up; it is the product.
`data/subscriptions.json` holds live push endpoints — treat it like PII.

## Security warnings

- The **admin panel and all `/api` write endpoints have no authentication**.
  Anyone who can reach the server can edit prayer times, post announcements,
  and blast notifications to every subscriber. Put the whole origin behind a
  firewall/VPN, basic auth, or another access gate.
- The server binds `0.0.0.0` so LAN devices can reach it. Only expose it
  publicly if the admin surface is protected.

## Adhan clock

A server-side tick checks for due reminders every 30 seconds, in Africa/Lagos
(`data/times.json` values are that zone's wall clock). The clock runs only
while the process is alive — run it under `systemd`/a process manager if
reminders must fire reliably.
