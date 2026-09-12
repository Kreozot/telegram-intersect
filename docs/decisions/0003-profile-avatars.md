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

## Extension: community avatars

Date: 2026-09-12. Status: ACCEPTED — requested by the owner.

Apply the same bounded static-image cache and authenticated endpoint to group photos observed during
common-chat scans. Group photo locators remain transient server-side inputs; only normalized group
metadata and local versioned avatar URLs reach the browser. The details list and focused-community
header show cached photos, while graph group nodes reveal them on hover without replacing their
intersection-count markers at rest.

Completed scans created before this extension have no retained group-photo locators. When one of
those people is selected again, the server refreshes that completed result once if any group has
neither a cached image nor an explicit Telegram no-photo observation. Explicit no-photo markers
prevent repeated scans for communities that legitimately have no avatar.
