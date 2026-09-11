# HTTP API

All URLs are relative to the single UI/API origin. JSON request bodies are schema-validated. Except health/access checks and owner-key login, routes require the HttpOnly session cookie. Every non-GET/HEAD API request also requires X-Intersect-Request: 1. Browser requests must use the same origin. Do not put secrets into URLs.

## Endpoints

| Method | Path | Meaning |
| --- | --- | --- |
| GET | /api/health | Public readiness response |
| GET | /api/access | Whether this browser session is unlocked |
| POST | /api/access | Unlock with { "key": "owner-key" } |
| DELETE | /api/access | Lock this browser session |
| GET | /api/telegram | Sanitized login stage and QR image, if applicable |
| POST | /api/telegram/login | Begin { "mode": "qr" } or { "mode": "phone" } |
| POST | /api/telegram/answer | Supply { "value": "current-challenge-answer" } |
| POST | /api/telegram/cancel | Cancel pending login |
| DELETE | /api/telegram | Revoke Telegram app session and delete account data |
| POST | /api/people | Discover { "source": "contacts" } or { "source": "dialogs" } |
| GET | /api/snapshot | Current people and scan; no access hashes |
| GET | /api/snapshot/completed | Last complete scan with current catalog |
| POST | /api/scans | Start { "ids": ["user:123"] } |
| POST | /api/scans/cancel | Cancel after current request settles |
| POST | /api/scans/resume | Resume unfinished entries and retry failures |
| DELETE | /api/analysis | Remove analysis data, retaining Telegram authorization |

The current catalog can change after a completed scan. A completed snapshot's person IDs may therefore include identities no longer in the current catalog. Each scan has per-person status, groups, and observation times. Only completed means that API pagination for that person finished; it does not guarantee universal membership visibility.

The browser polls /api/telegram and /api/snapshot serially with a 1.8-second interval. Catalog discovery stays within the POST request and preserves old data if it fails. A scan starts in the background; do not repeatedly create new scans while one is active.

## JavaScript (inside the unlocked same-origin UI)

```javascript
const response = await fetch("/api/snapshot", { credentials: "same-origin" });
if (!response.ok) throw new Error("Unlock the workspace first.");
const snapshot = await response.json();
```

## Python (local owner script)

```python
import getpass
import http.cookiejar
import json
import urllib.request

base = "http://127.0.0.1:4310"
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
)
request = urllib.request.Request(
    base + "/api/access",
    data=json.dumps({"key": getpass.getpass("Workspace key: ")}).encode(),
    headers={"Content-Type": "application/json", "X-Intersect-Request": "1"},
    method="POST",
)
with opener.open(request) as response:
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

For protected API testing, feed an access JSON body on standard input to avoid storing the key in shell history. Protect the cookie jar and remove it after use:

```sh
curl -c private-cookie-jar.txt -H "Content-Type: application/json" -H "X-Intersect-Request: 1" --data-binary @- http://127.0.0.1:4310/api/access
curl -b private-cookie-jar.txt http://127.0.0.1:4310/api/snapshot
```

The first command waits for a JSON object containing key on stdin; terminate stdin using your shell's EOF action. Do not commit the jar or real API results. Use HTTPS for hosted API calls.
