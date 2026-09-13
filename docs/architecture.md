# Architecture

Status: implemented first version; live Telegram and remote hosting checks remain pending.

## Approved stack and boundaries

React, Vite, Mantine, CSS Modules, Cytoscape.js, Node.js 24, Fastify, and SQLite were approved by the owner. The owner subsequently approved replacing archived GramJS with teleproto. Exact dependency versions are recorded in package.json and package-lock.json.

The repository root contains the application package and project documentation:

- scripts: local setup orchestration and testable `.env` transformations.
- src/web: browser UI, selection state, graph adapter, and private component subtrees.
- src/shared: typed domain contracts and pure graph/identity transformations.
- src/server/http: schema-validated API and HTTP composition.
- src/server/security: browser access, expiring opaque sessions, host/origin checks.
- src/server/telegram: authorization lifecycle, separate metadata retrieval, normalization, and privacy-constrained SDK.
- src/server/scans: durable adaptive scan scheduling and recovery.
- src/server/storage: SQLite records and authenticated session encryption.

No Telegram credential or access hash enters browser contracts. Components private to a parent are nested beside it; styles are colocated. Only shared contracts and pure transformations cross browser/server boundaries.

The local `npm run init` command uses Inquirer to explain Telegram application registration and
collect only missing credentials. It creates `.env` exclusively from `.env.example`, preserves an
existing file and unrelated settings, masks the API hash prompt, and never prints either secret.

## Data flow

1. Loopback access recognizes the local owner automatically; hosted access requires the configured
   workspace key.
2. TelegramService restores authorization or handles an explicit existing-account login.
3. MetadataService discovers contacts or dialog identities and normalizes them before persistence.
   Dialog discovery also retains each private dialog's ordinal catalog position for recent-activity
   sorting, without retaining its message timestamp or content.
   After commit, AvatarService sequentially refreshes small static profile images in the background.
4. A completed Contacts or Dialogs load asynchronously enqueues everyone in that source. Opening an
   authorized workspace also enqueues the persisted catalog once, so missing counts resume after a
   page reload. Browser selection changes can enqueue newly selected people after a short debounce.
   ScanService expands the current durable queue, reuses completed observations, and queries common
   groups through an adaptive three-worker pool while saving each page checkpoint. A flood wait pauses
   the whole pool, reduces new work to one worker, and allows gradual recovery. Loading another
   source pauses and resumes unfinished scan work so catalog and common-group requests do not overlap.
5. The browser loads one normalized snapshot, then receives person-scan and avatar deltas over a
   same-origin SSE connection. Only the short-lived login flow retains a small status poll. User
   commands and tab visibility restoration trigger one full refresh. The browser derives
   selected-person counts and graph edges locally.
6. Browser-local source preferences filter the identity catalog. People and community search compares
   normalized source text through per-letter English-style, passport-style, and j-based Russian
   transliteration alternatives in both Cyrillic-to-Latin and Latin-to-Cyrillic lookup directions.
   Alternatives may be mixed within one query without generating every complete spelling. The
   graph adapter can project the
   same observed bipartite edges from selected people to communities or from selected communities to
   people; no participant-list request is introduced by the inverted projection.

Development uses Vite middleware and HMR on the application HTTP server. Production serves the built static UI and API from one port. Scan jobs run independently of HTTP request lifetimes; catalog discovery currently stays within its initiating request.

A separate Vite demo mode produces a static GitHub Pages artifact. It starts directly from synthetic
browser data, uses relative asset URLs, skips workspace API initialization, and removes the action
that would leave demo mode. The Pages workflow deploys only browser output; it never packages the
server, private configuration, or persistent data.

## Privacy adapter

PrivacyClient limits application RPCs to identity, common-group, connection configuration, and authentication operations. It wraps them in invokeWithoutUpdates. AuthorizationSession discards SDK entity-cache writes. MetadataUpdates disables background update initialization, catch-up, and dispatch while retaining transport keepalives. QR login polls tokens instead of enabling the SDK event stream.

The adapter uses teleproto's update-manager extension surface and its DC-switch helper for QR migration. These integration points are version-sensitive and require rechecking on upgrades. Required SDK handshakes use the SDK transport; the application does not claim that every transport packet passes through the RPC allowlist.

Dialog responses contain incidental top messages; normalization clears that vector in a finally block
and returns only ordered people and ephemeral cursor fields. The catalog stores a sequential dialog
position, not message fields. Nothing serializes raw Telegram objects. See privacy.md.

## Stored data and scan semantics

SQLite stores allowlisted person metadata, server-only access hashes and person photo locators,
cached static person and group images, the current scan, the last fully completed scan, and encrypted
authorization material. IDs remain namespaced decimal strings. Scan entries include groups, status,
cursor, observation timestamp, and retry time. Avatar URLs are authenticated application endpoints
versioned by the cached photo ID; an existing image remains visible until its replacement has been
validated and saved.

Each page is persisted atomically. Completed snapshots remain separate from in-progress refreshes. Cancelled or failed scans retain observed edges and checkpoints; they never become authoritative empty results. Restart marks interrupted jobs as cancelled for explicit resume. Rate-limit retry times are retained across restart. The graph shown by default is the current scan; the previous completed snapshot is available through the API.

The current scan can expand while its workers are active. Selection removal is a browser graph concern:
it neither deletes cached observations nor cancels a provider request already in progress. The pool
starts at three workers, falls back to one after a global flood wait, and gradually returns to three.
The server publishes and enforces the `MAX_SELECTED_PEOPLE` boundary; the browser applies the same
limit to individual and bulk selection before enqueueing a scan.

Catalog refresh commits only after full source discovery. Source flags are deduplicated and refreshed independently. Discovery, deletion, and scanning reject conflicting operations. A single process owns each database; horizontal scaling is outside this release.

## Access, storage, and hosting

Loopback mode authorizes requests automatically and does not create an access key or expose a Lock
action. Host and origin validation plus a custom mutation header remain enforced. Hosted mode uses
the owner access key to issue an opaque, 12-hour, in-memory browser session cookie. Process restart
invalidates hosted browser sessions, not Telegram authorization. Key login is rate-limited and
unknown errors are sanitized.

Local mode defaults to loopback. Hosted mode requires an exact HTTPS origin and configured secrets; non-loopback startup fails without them. The reverse proxy preserves Host and terminates TLS.

The Docker Compose path binds the host-published port specifically to `127.0.0.1` while the process
listens on the container interface. Its explicit `LOOPBACK_PROXY=true` setting treats that boundary
as local mode. This exception is safe only with the supplied loopback-only port publication; hosted
containers must disable it and use the normal hosted-mode secrets and HTTPS origin.

Telegram session strings are encrypted with AES-256-GCM. The key is provided by the environment or stored outside SQLite in a local file. Filesystem permissions protect remaining metadata; Windows inherits the parent ACL. Disconnect revokes the Telegram session before local deletion. Analysis deletion retains authorization. Backup retention and full-disk encryption are operator responsibilities.

## Limits and follow-ups

- Real-account login, migration, and large-catalog pagination still need interactive verification.
- Email/CAPTCHA/account registration auth flows are unsupported.
- Catalog import is not a durable resumable job; retry preserves the prior catalog.
- Graph layout uses Cytoscape CoSE followed by a bounded body-collision separation pass. People use circular cached avatars with naturally sized name labels below and a colored-circle fallback; groups use compact avatar markers with count labels and names on hover/selection. Group borders run from cool blue to warm red according to the observed selected-person count, using the number of selected people as the scale ceiling, and markers enlarge slightly on hover or selection. For multi-person selections, an explicit default intersection filter retains groups observed for at least two selected people. The canvas and details list use the same filtered graph; top-level metrics retain full scan counts. Single-person selections show all their groups. Filtering and renderer-only color derivation never change stored data. Large maps still need broader performance limits.
- The graph canvas can transition from its layout slot to a fixed viewport layer and back. The slot
  preserves page geometry, the browser locks document scrolling while expanded, and Cytoscape is
  resized and fitted after each transition. Escape and the corner control both restore the inline
  view; reduced-motion preferences disable the spatial animation.
- Multi-user service, scheduled refresh, group participant import, exports, and group–group projections remain outside initial scope.
