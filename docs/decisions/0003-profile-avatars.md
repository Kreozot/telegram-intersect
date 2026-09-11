# Decision 0003: Cache-first static profile avatars

Date: 2026-09-11. Status: ACCEPTED — requested by the owner.

## Decision

Load the small static profile-photo rendition after a successful contact or dialog catalog commit.
Avatar work runs in a sequential background queue and never delays or rolls back the catalog response.
Only bounded JPEG, PNG, or WebP bytes are accepted; animated and unrecognized formats are discarded.

Cache images in the existing private SQLite database. The browser receives only an authenticated,
same-origin application URL versioned with the cached Telegram photo ID. A previous cached image is
kept visible while a changed photo downloads, and initials remain the fallback when no cache exists.

## Consequences

- The privacy client exposes a dedicated profile-thumbnail method that constructs `upload.GetFile`
  internally; generic file requests remain blocked and no media proxy is exposed to the browser.
- Clearing analysis data or disconnecting Telegram deletes avatar bytes with the catalog.
- Avatar download failures are silent and recover on a later catalog refresh without affecting people
  discovery or graph scanning.
