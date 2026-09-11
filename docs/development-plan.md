# Development plan

Updated: 2026-09-11. Checkboxes describe verified outcomes, not merely intended work.

## Completed implementation

- [x] Record requirements, architecture, coding practices, style, and agent instructions in English.
- [x] Obtain stack/single-owner approval and subsequent teleproto substitution approval.
- [x] Record explicit permission to discard incidental dialog top messages.
- [x] Scaffold strict TypeScript, npm lockfile, Biome, Vite, Fastify, and SQLite.
- [x] Implement owner access, same-origin API protection, encrypted session persistence, login challenges, and deletion paths.
- [x] Implement normalized people discovery, independent source merging, filters, search, and selection.
- [x] Add non-blocking static profile-avatar loading with authenticated local caching.
- [x] Implement sequential common-group scans, pagination, flood waits, checkpoint persistence, cancellation, and restart/resume behavior.
- [x] Trigger common-group scans from selection and allow the active durable queue to expand.
- [x] Enforce a configurable simultaneous people-selection limit, defaulting to 50.
- [x] Implement person–group graph, community counts, details, focus, themes, and synthetic demo.
- [x] Add recent-activity and A–Z people sorting with an independent selected-first option.
- [x] Add Pinokio runtime/install/start/update/dependency-reset scripts.
- [x] Add README setup, configuration, launch, debug, hosting, and Pinokio instructions.
- [x] Build and start the production application locally.
- [x] Verify synthetic graph/details and light/dark rendering in a browser.
- [x] Verify development/debug startup and dialog-source bulk selection in the browser.

## Verification and release gates

- [x] Complete lint/type/test/build verification.
- [x] Owner confirmed QR login with two-step verification and contact loading.
- [ ] Verify phone/code login with the owner's actual Telegram account.
- [ ] Verify live Telegram contacts, archived dialogs, pagination, migrations, and flood-wait behavior.
- [ ] Exercise Pinokio install/start/update/reset on its running control plane.
- [ ] Exercise hosted HTTPS setup behind a reverse proxy.
- [ ] Measure realistic graph layout performance and document a supported size range.
- [ ] Choose a repository license and Git host destination before public distribution.

Initial synthetic tests cover privacy normalization, method blocking, encryption, browser access, graph deduplication/counts, multipage scans, flood-wait cancellation/resume, and launcher URL capture. No real Telegram messages or contacts have been used for development or tests.

## Known scope and limitations

Dense-map readability: replaced always-visible community titles with compact count markers and hover/selection names, emphasized people, added a cool-to-warm group color scale for observed selected-person counts, added a default optional intersection filter, and separated residual node collisions after CoSE. Browser verification uses a synthetic 3-person, 135-community, 187-edge fixture in both filtered and complete views. Automated tests cover filter integrity, temperature-scale derivation, and collision separation; arbitrary large datasets remain unbenchmarked.

An owner-reported zero-community result was traced to an imported catalog with no scan record. Catalog import alone does not run group discovery. Selecting people now queues discovery asynchronously, and the explorer shows an unknown count until observations establish a value. Zero is shown for an empty selection result only after all selected people have completed scanning.

The first release has one owner and one Telegram account per installation. Catalog discovery is request-bound rather than a durable background import. Unsupported email/CAPTCHA/registration auth challenges must not silently create accounts or accept terms. Large-graph optimization has not been benchmarked. A previous complete scan remains available through the API; the UI displays the current scan by default.

Group participant import, multi-user hosting, multiple accounts, scheduled refresh, historical comparison, exports, and a group–group projection are deferred.
