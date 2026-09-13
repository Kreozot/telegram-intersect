# Development plan

Updated: 2026-09-13. Checkboxes describe verified outcomes, not merely intended work.

## Completed implementation

- [x] Add persistent Contacts/Dialogs source controls and People/Communities map projections over
  observed membership data.

- [x] Record requirements, architecture, coding practices, style, and agent instructions in English.
- [x] Obtain stack/single-owner approval and subsequent teleproto substitution approval.
- [x] Record explicit permission to discard incidental dialog top messages.
- [x] Scaffold strict TypeScript, npm lockfile, Biome, Vite, Fastify, and SQLite.
- [x] Implement owner access, same-origin API protection, encrypted session persistence, login challenges, and deletion paths.
- [x] Authorize loopback-only owner access automatically while retaining access-key sessions for hosted mode.
- [x] Implement normalized people discovery, independent source merging, filters, search, and selection.
- [x] Add non-blocking static profile-avatar loading with authenticated local caching.
- [x] Extend the avatar cache to observed communities and show photos in the community lens and graph.
- [x] Implement durable common-group scans, pagination, flood waits, checkpoint persistence,
  cancellation, and restart/resume behavior.
- [x] Trigger common-group scans from selection and allow the active durable queue to expand.
- [x] Populate common-group counts asynchronously after loading Contacts or Dialogs.
- [x] Resume missing catalog-wide counts when an authorized workspace is opened.
- [x] Replace fixed sequential scan pacing with adaptive concurrency and global flood-wait backoff.
- [x] Replace recurring full-snapshot scan/avatar polling with incremental SSE updates.
- [x] Enforce a configurable simultaneous people-selection limit, defaulting to 50.
- [x] Implement person–group graph, community counts, details, focus, themes, and synthetic demo.
- [x] Add an animated, keyboard-accessible full-screen graph view with reversible slot positioning.
- [x] Add recent-activity/discovery, A–Z, and descending observed-connection sorting in both map
  modes, with an independent selected-first option.
- [x] Limit browser polling to active login and scan work, with command and tab-return refreshes.
- [x] Add README setup, configuration, launch, debug, and hosting instructions.
- [x] Remove the discontinued Pinokio packaging and launcher integration.
- [x] Build and start the production application locally.
- [x] Verify synthetic graph/details and light/dark rendering in a browser.
- [x] Verify development/debug startup and dialog-source bulk selection in the browser.
- [x] Add a multi-stage Docker image and loopback-only Compose launch path with persistent data.
- [x] Add a demo-only GitHub Pages build that deploys automatically after updates to `main`.

## Verification and release gates

- [x] Complete lint/type/test/build verification.
- [x] Add Stylelint standard CSS checks alongside Biome's broader source checks.
- [x] Run Biome and Stylelint against applicable staged files before each commit.
- [x] Owner confirmed QR login with two-step verification and contact loading.
- [ ] Verify phone/code login with the owner's actual Telegram account.
- [ ] Verify live Telegram contacts, archived dialogs, pagination, migrations, and flood-wait behavior.
- [ ] Exercise hosted HTTPS setup behind a reverse proxy.
- [ ] Exercise the Docker Compose launch path with a local Docker daemon.
- [ ] Measure realistic graph layout performance and document a supported size range.
- [ ] Choose a repository license and Git host destination before public distribution.

Initial synthetic tests cover privacy normalization, method blocking, encryption, browser access, graph deduplication/counts, multipage scans, flood-wait cancellation/resume, and launcher URL capture. No real Telegram messages or contacts have been used for development or tests.

## Known scope and limitations

Dense-map readability: replaced always-visible community titles with compact avatar/count markers and hover/selection names, emphasized people, added a cool-to-warm group-border scale for observed selected-person counts, added a default optional intersection filter, and separated residual node collisions after CoSE. Browser verification uses a synthetic 3-person, 135-community, 187-edge fixture in both filtered and complete views. Automated tests cover filter integrity, temperature-scale derivation, and collision separation; arbitrary large datasets remain unbenchmarked.

An owner-reported zero-community result was traced to an imported catalog with no scan record.
Catalog loads now queue group discovery for the complete loaded source asynchronously; selecting
people can also expand that queue. The explorer shows an unknown count until observations establish
a value. Zero is shown for an empty selection result only after all selected people have completed
scanning.

The first release has one owner and one Telegram account per installation. Catalog discovery is request-bound rather than a durable background import. Unsupported email/CAPTCHA/registration auth challenges must not silently create accounts or accept terms. Large-graph optimization has not been benchmarked. A previous complete scan remains available through the API; the UI displays the current scan by default.

Group participant import, multi-user hosting, multiple accounts, scheduled refresh, historical comparison, exports, and a group–group projection are deferred.
