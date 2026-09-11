# Architecture

Status: implemented first version; live Telegram, Pinokio lifecycle, and remote hosting checks remain pending.

## Approved stack and boundaries

React, Vite, Mantine, CSS Modules, Cytoscape.js, Node.js 24, Fastify, and SQLite were approved by the owner. The owner subsequently approved replacing archived GramJS with teleproto. Exact dependency versions are recorded in app/package.json and app/package-lock.json.

The root contains documentation and Pinokio launchers. The self-contained application package is under app/:

- src/web: browser UI, selection state, graph adapter, and private component subtrees.
- src/shared: typed domain contracts and pure graph/identity transformations.
- src/server/http: schema-validated API and HTTP composition.
- src/server/security: browser access, expiring opaque sessions, host/origin checks.
- src/server/telegram: authorization lifecycle, separate metadata retrieval, normalization, and privacy-constrained SDK.
- src/server/scans: durable sequential scan scheduling and recovery.
- src/server/storage: SQLite records and authenticated session encryption.

No Telegram credential or access hash enters browser contracts. Components private to a parent are nested beside it; styles are colocated. Only shared contracts and pure transformations cross browser/server boundaries.

## Data flow

1. The owner unlocks the browser using a local or configured workspace key.
2. TelegramService restores authorization or handles an explicit existing-account login.
3. MetadataService discovers contacts or dialog identities and normalizes them before persistence.
   After commit, AvatarService sequentially refreshes small static profile images in the background.
4. Browser selection changes asynchronously enqueue newly selected people after a short debounce.
   ScanService expands the current durable queue, reuses completed observations, and queries common
   groups sequentially through the metadata gateway while saving each page checkpoint.
5. The browser polls normalized snapshots and derives selected-person counts and graph edges locally.

Development uses Vite middleware and HMR on the application HTTP server. Production serves the built static UI and API from one port. Scan jobs run independently of HTTP request lifetimes; catalog discovery currently stays within its initiating request.

## Privacy adapter

PrivacyClient limits application RPCs to identity, common-group, connection configuration, and authentication operations. It wraps them in invokeWithoutUpdates. AuthorizationSession discards SDK entity-cache writes. MetadataUpdates disables background update initialization, catch-up, and dispatch while retaining transport keepalives. QR login polls tokens instead of enabling the SDK event stream.

The adapter uses teleproto's update-manager extension surface and its DC-switch helper for QR migration. These integration points are version-sensitive and require rechecking on upgrades. Required SDK handshakes use the SDK transport; the application does not claim that every transport packet passes through the RPC allowlist.

Dialog responses contain incidental top messages; normalization clears that vector in a finally block and returns only people and ephemeral cursor fields. Nothing serializes raw Telegram objects. See privacy.md.

## Stored data and scan semantics

SQLite stores allowlisted person metadata, server-only access hashes and photo locators, cached static profile images, the current scan, the last fully completed scan, and encrypted authorization material. IDs remain namespaced decimal strings. Scan entries include groups, status, cursor, observation timestamp, and retry time. Avatar URLs are authenticated application endpoints versioned by the cached photo ID; an existing image remains visible until its replacement has been validated and saved.

Each page is persisted atomically. Completed snapshots remain separate from in-progress refreshes. Cancelled or failed scans retain observed edges and checkpoints; they never become authoritative empty results. Restart marks interrupted jobs as cancelled for explicit resume. Rate-limit retry times are retained across restart. The graph shown by default is the current scan; the previous completed snapshot is available through the API.

The current scan can expand while its worker is active. Selection removal is a browser graph concern:
it neither deletes cached observations nor cancels a provider request already in progress. The worker
remains sequential, including when a bulk selection appends many people.
The server publishes and enforces the `MAX_SELECTED_PEOPLE` boundary; the browser applies the same
limit to individual and bulk selection before enqueueing a scan.

Catalog refresh commits only after full source discovery. Source flags are deduplicated and refreshed independently. Discovery, deletion, and scanning reject conflicting operations. A single process owns each database; horizontal scaling is outside this release.

## Access, storage, and hosting

The owner access key yields an opaque, 12-hour, in-memory browser session cookie. Process restart invalidates browser sessions, not Telegram authorization. Login is rate-limited; API mutations require a custom header and same-origin validation. Unknown errors are sanitized.

Local mode defaults to loopback. Hosted mode requires an exact HTTPS origin and configured secrets; non-loopback startup fails without them. The reverse proxy preserves Host and terminates TLS. Pinokio uses a dedicated local Node runtime and a dynamic loopback port.

Telegram session strings are encrypted with AES-256-GCM. The key is provided by the environment or stored outside SQLite in a local file. Filesystem permissions protect remaining metadata; Windows inherits the parent ACL. Disconnect revokes the Telegram session before local deletion. Analysis deletion retains authorization. Backup retention and full-disk encryption are operator responsibilities.

## Limits and follow-ups

- Real-account login, migration, and large-catalog pagination still need interactive verification.
- Email/CAPTCHA/account registration auth flows are unsupported.
- Catalog import is not a durable resumable job; retry preserves the prior catalog.
- Graph layout uses Cytoscape CoSE followed by a bounded body-collision separation pass. People use circular cached avatars with naturally sized name labels below and a colored-circle fallback; groups use compact count markers with names on hover/selection. Group marker colors run from cool blue to warm red according to the observed selected-person count, using the number of selected people as the scale ceiling. For multi-person selections, an explicit default intersection filter retains groups observed for at least two selected people. The canvas and details list use the same filtered graph; top-level metrics retain full scan counts. Single-person selections show all their groups. Filtering and renderer-only color derivation never change stored data. Large maps still need broader performance limits.
- Multi-user service, scheduled refresh, group participant import, exports, and group–group projections remain outside initial scope.
