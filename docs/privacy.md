# Privacy and data handling

## Owner-approved boundary

The owner requires no conversation loading or storage. The owner explicitly accepted Telegram's unavoidable top-message fields in dialog-list responses if immediately discarded without storage or browser transmission.

Do not interpret this exception as authorization to fetch message history, search messages, synchronize message updates, download message media, or build a conversation archive. The owner separately approved bounded static profile thumbnails on 2026-09-11.

## Data inventory

| Data | Retention | Purpose |
| --- | --- | --- |
| Person ID, display name, optional username, source flags | SQLite until clear/disconnect | Selection and graph labels |
| Person access hash | Server-side SQLite only | Address common-group requests |
| Profile photo ID/DC locator | Server-side SQLite only | Refresh the small static avatar rendition |
| Static JPEG/PNG/WebP avatar | SQLite until clear/disconnect | Cache-first person identification in the UI |
| Group ID and title | SQLite scan observations | Graph nodes |
| Person/group associations | Current and last complete scan | Observed connections and counts |
| Scan status, cursor, retry time, timestamps, safe error | SQLite | Progress, cancellation, recovery |
| Telegram session authorization | AES-256-GCM encrypted in SQLite | Reconnect without repeated login |
| Encryption key | Environment or separate local file | Decrypt session |
| Workspace access key | Environment or separate local file | Authenticate owner browsers |
| Browser session ID | Server memory and HttpOnly cookie for up to 12 hours | API access |
| Phone/code/2FA inputs | Transient challenge/request memory only | Complete explicit login |
| Dialog top-message content | Transient response memory only; immediately dropped | Unavoidable Telegram response fields |
| Dialog page cursor date/message ID/peer | Transient server memory only | Continue dialog-list pagination |
| Theme preference | Browser storage via Mantine | Persist light/dark preference |
| Demo data | Synthetic browser data only | Preview UI without Telegram |

No message attachments or animated avatars are downloaded. Contact phone numbers, presence, biographies, message bodies, and raw responses are not stored. Runtime memory is garbage-collected; the application does not promise forensic erasure of process memory, OS swap, or external backups.

## Enforcement

- PrivacyClient rejects non-allowlisted RPCs, including history, message retrieval, and update-difference methods.
- A dedicated PrivacyClient method constructs only a small peer profile-photo request; generic file-download requests remain rejected.
- Application RPCs use invokeWithoutUpdates. The SDK's background update manager is replaced with a no-sync implementation.
- SDK entity caching and protocol logging are disabled.
- Dialog normalization reduces identities and cursor metadata, clearing messages even on failure.
- Repository writes enumerate allowed fields.
- Public catalog responses exclude access hashes.
- Fastify request logging is disabled. Unexpected errors use generic messages.
- Demo mode never imports synthetic data into the owner's database.

Tests inject sentinel message/phone values and assert that normalized and stored data exclude them. Tests also prove update recovery cannot make RPCs. These are software checks, not a packet capture of a live Telegram account.

## Deletion and backups

Lock revokes the current browser session only. Clear local data removes catalogs, snapshots, and cached avatars while preserving Telegram authorization. Disconnect revokes the remote app session and clears all local account records, including avatars; other Telegram clients are unaffected.

SQLite secure_delete and VACUUM reduce remnants in the active database but cannot delete filesystem snapshots, SSD remapping copies, or independent backups. Keep the private data directory outside published artifacts and limit OS access. Stop the process for consistent backups, protect them, and apply a retention policy.
