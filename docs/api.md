# HTTP API

All URLs are relative to the single UI/API origin. JSON request bodies are schema-validated. Local
loopback mode authorizes requests automatically. Hosted mode requires the HttpOnly session cookie
except for health/access checks and owner-key login. Every non-GET/HEAD API request also requires
`X-Intersect-Request: 1`. Browser requests must use the same origin. Do not put secrets into URLs.

## Endpoints

| Method | Path | Meaning |
| --- | --- | --- |
| GET | /api/health | Public readiness response |
| GET | /api/access | Access status and `local` or `key` access mode |
| POST | /api/access | Hosted mode: unlock with `{ "key": "owner-key" }` |
| DELETE | /api/access | Hosted mode: lock this browser session |
| GET | /api/telegram | Sanitized login stage and QR image, if applicable |
| POST | /api/telegram/login | Begin { "mode": "qr" } or { "mode": "phone" } |
| POST | /api/telegram/answer | Supply { "value": "current-challenge-answer" } |
| POST | /api/telegram/cancel | Cancel pending login |
| DELETE | /api/telegram | Revoke Telegram app session and delete account data |
| POST | /api/people | Discover { "source": "contacts" } or { "source": "dialogs" } |
| GET | /api/snapshot | Current people and scan; no access hashes |
| GET | /api/snapshot/completed | Last complete scan with current catalog |
| POST | /api/scans | Add selected `{ "ids": ["user:123"] }` identities to the background queue |
| POST | /api/scans/cancel | Cancel after current request settles |
| POST | /api/scans/resume | Resume unfinished entries and retry failures |
| DELETE | /api/analysis | Remove analysis data, retaining Telegram authorization |

The current catalog can change after a completed scan. A completed snapshot's person IDs may therefore include identities no longer in the current catalog. Each scan has per-person status, groups, and observation times. Only completed means that API pagination for that person finished; it does not guarantee universal membership visibility.

While login or scanning is active, the browser polls /api/telegram and /api/snapshot with a 1.8-second interval. Idle workspaces do not poll. Commands and returning to a visible tab trigger one refresh. The browser checks /api/access when it first opens; hosted authenticated workspace requests use HTTP 401 to detect later session expiry. Catalog discovery stays within the POST request and preserves old data if it fails. Selection changes are debounced for 250 ms before posting the selected IDs. The endpoint reuses completed observations and may safely append newly selected people while the sequential worker is active.

## JavaScript (inside the unlocked same-origin UI)

```javascript
const response = await fetch("/api/snapshot", { credentials: "same-origin" });
if (!response.ok) throw new Error("Unlock the workspace first.");
const snapshot = await response.json();
```

## Python (local owner script)

```python
import json
import urllib.request

base = "http://127.0.0.1:4310"
request = urllib.request.Request(
    base + "/api/scans",
    data=json.dumps({"ids": ["user:123"]}).encode(),
    headers={"Content-Type": "application/json", "X-Intersect-Request": "1"},
    method="POST",
)
with urllib.request.urlopen(request) as response:
    response.read()
with opener.open(base + "/api/snapshot") as response:
    snapshot = json.load(response)
# Use metadata locally; do not print or upload real datasets by default.
```

## curl

Public readiness does not require credentials:

```sh
curl http://127.0.0.1:4310/api/health
```

Local loopback API testing needs no access key:

```sh
curl http://127.0.0.1:4310/api/snapshot
```

Hosted API clients must first POST the owner key to `/api/access`, retain the returned cookie, and use
HTTPS. Feed the JSON body on standard input to avoid storing the key in shell history. Protect the
cookie jar, and do not commit it or real API results.
