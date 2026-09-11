# Telegram Intersect

A self-hosted web application that reveals which Telegram communities connect the people you know.

Select people from saved contacts or private dialogs and compare their shared communities across the
whole selection. Intersect checks which groups each selected person shares with your account, then
combines those observations into an interactive graph showing where several selected people overlap.
Community counts refer to selected people with observed memberships, not total group membership.

## Screenshots

Explore the synthetic demo without connecting a Telegram account. Select people to see where their
communities overlap and inspect how each community connects the selected contacts.

![Dark demo overview showing selected contacts and their shared-community graph](screenshots/demo-overview.png)

Select a community to focus its graph connections and see every selected person observed in it.

![Light demo view focused on the Design collective community](screenshots/community-detail.png)

## Features

- Telegram QR or phone/code sign-in, including two-step verification.
- Separate contact and dialog discovery, search, source filters, activity/A–Z sorting, and bulk selection.
- Cache-first static profile avatars downloaded sequentially after catalog loading.
- Cytoscape graph with neighborhood highlighting, zoom, fit, community counts, and a keyboard-accessible details panel.
- Light and dark themes, plus a clearly labeled synthetic demo requiring no account.
- Sequential scans with pagination, Telegram flood waits, cancellation, checkpoints, and resume after a restart.
- Local SQLite metadata storage and encrypted Telegram authorization sessions.
- Owner access protection for both local and hosted installations.
- Pinokio install, start, update, and dependency-reset launchers.

## Privacy: no conversation archive

Intersect does **not** request message history, search messages, download message attachments, send messages, or mark conversations as read. It downloads only small static profile thumbnails after catalog discovery. Application and protocol request logging are disabled.

Telegram's [dialog-list API](https://core.telegram.org/method/messages.getDialogs) includes top-message objects unavoidably. If you click **Load dialogs**, these are received transiently, reduced to pagination metadata, and discarded in the server adapter. Message content is never stored, logged, or sent to the browser. This behavior was explicitly approved by the owner. **Load contacts** does not make dialog-list requests.

The Telegram adapter has a method allowlist, disables the SDK's update synchronization and entity cache, and wraps application RPCs in invokeWithoutUpdates. It also discards unsolicited update payloads rather than retaining or processing them. The transport still performs required connection handshakes and keepalives. See [privacy and data handling](docs/privacy.md) for precise boundaries and retained fields.

Only chats [shared with your signed-in account](https://core.telegram.org/method/messages.getCommonChats) are visible. A missing edge in a partial scan is not proof of non-membership, and sharing a group does not prove that people know each other.

## Run locally

Prerequisites: **Node.js 24.x** and npm. Node's built-in SQLite API is used; other Node major versions are intentionally rejected by npm.

From this repository:

```sh
cd app
npm ci
npm run build
npm start
```

Open [http://127.0.0.1:4310](http://127.0.0.1:4310). One server serves both the UI and API. Without Telegram credentials you can immediately choose **Explore demo**.

On first startup, local secrets are generated in `app/data/`. To unlock your workspace, open `app/data/access-key` locally and paste its value into the access-key field. The key is never printed by the server. Keep this directory accessible only to the owner; Windows permissions follow the parent directory's ACL.

### Connect Telegram

1. Create your own Telegram application at [my.telegram.org/apps](https://my.telegram.org/apps) to obtain `api_id` and `api_hash`. These are user-client credentials, not a bot token.
2. Copy `app/.env.example` to `app/.env`.
3. Fill in `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`, then restart the server.
4. Unlock the workspace and sign in with QR or phone/code. For QR, use Telegram → Settings → Devices → Link Desktop Device.
5. Load contacts, dialog identities, or both. Choose a source tab, search if needed, and use **Select visible** or individual checkboxes.
6. Select people; their shared groups are checked asynchronously and the map grows as results arrive.
   Select a community or graph node to inspect connections.

Loading contacts alone does not query groups. Selecting people adds them to a sequential background scan after a short debounce. Until observations arrive, community/connection counts show **—** (unknown). A zero is only confirmed after every selected person has completed scanning; partial scans may already show observed connections. Completed observations are reused when a person is selected again.

For two or more selected people, **Only intersections** initially shows groups observed for at least two of them. Turn it off to include groups observed for just one selected person. The displayed/total counter explains this filter; summary metrics always describe the full selection. People appear as circular avatars with naturally sized name labels underneath, while group markers show the number of selected people. Hover or select a group for its name, and select a person to highlight their connections. Full titles remain available in the details panel.

SMS delivery is not guaranteed for third-party clients. Telegram may deliver a code through an existing Telegram session. Unsupported email setup, CAPTCHA, registration, or other additional authorization challenges are reported as unsupported; try the QR flow for an existing account. Never paste Telegram secrets into issues or logs.

### Configuration

Values come from the process environment, then `app/.env`. Paths are resolved from the `app/` working directory.

| Variable | Default | Purpose |
| --- | --- | --- |
| TELEGRAM_API_ID / TELEGRAM_API_HASH | unset | Your Telegram client credentials |
| HOST | 127.0.0.1 | Listening interface |
| PORT | 4310 | UI/API port; 0 chooses an available port |
| MAX_SELECTED_PEOPLE | 50 | Maximum number of people selected at the same time |
| DATA_DIR | data | Private SQLite database and generated local keys |
| APP_ACCESS_KEY | generated local key | Owner workspace access; at least 24 random characters |
| SESSION_ENCRYPTION_KEY | generated local key | Exactly 64 hexadecimal characters for session encryption |
| PUBLIC_ORIGIN | unset | Exact HTTPS origin for hosted mode, with no trailing slash |

A restart requires unlocking the browser again. The encrypted Telegram session and scan checkpoints survive. **Lock** ends only the current browser session. **Disconnect Telegram** revokes this app's Telegram session and deletes local account data. **Clear local data** deletes analysis data while retaining Telegram authorization. Neither action deletes Telegram chats or contacts.

## Development and debugging

```sh
cd app
npm ci
npm run dev
```

Open the same port, normally 4310. Vite runs as middleware on the server port and refreshes frontend changes. Restart the process after changing backend code or environment variables.

```sh
npm run debug
```

This starts development mode with the Node inspector bound to **127.0.0.1:9229**. Attach a Node debugger to port 9229; the repository includes a VS Code attach configuration. Set backend breakpoints under `app/src/server/`. For frontend breakpoints, use browser developer tools and the Vite source modules under `app/src/web/`.

Do not expose the inspector port publicly. Do not enable raw Telegram/debug payload logging or inspect/share real message payloads. Reproduce bugs with the synthetic demo or test fixtures whenever possible.

Quality checks:

```sh
npm run check
npm test
npm run build
```

Format supported source files with `npm run format`. Biome configuration is in the repository root,
and Stylelint configuration is in `app/stylelint.config.mjs`. Run `npm run lint:css` for a focused
stylesheet check. Tests use Node's runner and synthetic Telegram objects; they require no account or
network.

For a port conflict, stop the other instance or change PORT. If saved authorization cannot be restored, check connectivity and the original SESSION_ENCRYPTION_KEY, or sign in again. Do not replace the encryption key while expecting existing encrypted sessions to remain readable. If catalog loading fails, existing data is preserved. A flood wait must expire before retrying. If a scan was interrupted, unlock and use **Resume unfinished scan**.

## Pinokio

This repository includes an app launcher at its root and application code in `app/`. No absolute local machine paths are embedded.

1. Download the published repository URL through Pinokio, or place a development checkout under `PINOKIO_HOME/api/telegram-intersect`.
2. Choose **Install**. The launcher provisions an isolated Node.js 24 Conda environment in `runtime/`, runs `npm ci`, and builds the app.
3. Choose **Start**. The launcher selects a free port, binds loopback, captures the server's ready URL, and offers **Open Web UI**.
4. Configure `app/.env` for Telegram and restart. Use the emitted HTTP URL in local mode; HTTPS proxy aliases need a matching hosted-origin configuration.
5. **Update** fast-forwards the repository and reinstalls/builds dependencies. It requires a configured Git upstream and will not force through divergent history.
6. **Reset dependencies (keeps data)** removes only `runtime/`, `app/node_modules/`, and `app/dist/`. It preserves `app/.env`, `app/data/`, and externally configured DATA_DIR. Use Pinokio's native stop action before resetting.

For launcher failures, check `logs/api/` (including the latest log for install/start) and `logs/shell/`. Do not upload logs containing secrets. Node inspector debugging is available through the manual developer command above; the ordinary Pinokio launcher does not expose an inspector.

To distribute the launcher, publish this repository to a Git host and use that repository URL in Pinokio. No repository has been pushed or registered in a Pinokio directory by this implementation. Choose a project license before public distribution. Pinokio lifecycle execution remains to be verified on a running Pinokio control plane; launcher syntax, URL capture, and menu states are tested locally.

## Hosting on a server

Use the same build/start commands with Node.js 24. Run exactly one application process per DATA_DIR; this release is not a multi-user service or a multi-process job system.

Set a long random APP_ACCESS_KEY, a persistent SESSION_ENCRYPTION_KEY, and PUBLIC_ORIGIN (for example `https://intersect.example.com`). Place an HTTPS reverse proxy in front of the process, preserve the original Host header, and forward to its private port. Keep the backend port inaccessible from the public network. To bind a non-loopback interface, HOST, PUBLIC_ORIGIN, and both keys must be explicitly configured; startup refuses an unprotected remote configuration. The proxy must support the expected request duration for catalog discovery.

Browser cookies are HttpOnly and SameSite=Strict, with Secure in hosted mode. API mutations require the application's request header; request host/origin checks reject unrelated origins. No CORS access is enabled.

Keep DATA_DIR and keys on private persistent storage. Stop the process before copying the database for backup; store backups securely and keep the encryption key separate from the database backup. Deleting local records does not erase old external backups. Full-disk encryption is recommended if metadata-at-rest confidentiality beyond filesystem permissions is needed; only Telegram session material is encrypted inside SQLite.

## API

[API documentation](docs/api.md) includes endpoint semantics and JavaScript, Python, and curl examples. Use owner authorization and cookies; never embed access keys in URLs.

## Implementation and validation status

The application builds and runs locally. Automated checks cover identity deduplication, graph counts, privacy normalization, blocked Telegram operations, encryption, authorization boundaries, pagination, cancellation/recovery, and Pinokio launchers. Browser checks cover the synthetic graph, details, selection, and themes.

The owner has confirmed QR login with two-step verification and contact loading. Phone/code login and live-account pagination remain unverified. Pinokio install/start and remote HTTPS deployment have **not** been exercised end-to-end. See [development plan](docs/development-plan.md) for remaining release checks.

## Project documentation

- [Requirements](docs/requirements.md)
- [Development plan](docs/development-plan.md)
- [Architecture](docs/architecture.md)
- [Technology decisions](docs/decisions/0001-stack-proposal.md)
- [Implementation and privacy decisions](docs/decisions/0002-implementation-and-privacy.md)
- [Selection-triggered scan decision](docs/decisions/0004-selection-triggered-scans.md)
- [Configurable selection-limit decision](docs/decisions/0005-selection-limit.md)
- [Coding practices](docs/coding-practices.md)
- [Code style](docs/code-style.md)
- [Agent instructions](AGENTS.md)

Documentation, comments, commit messages, and pull requests are written in English.
