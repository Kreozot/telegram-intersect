# Decision 0008: Remove Pinokio integration

Status: ACCEPTED — owner approved removal on 2026-09-12.
Date: 2026-09-12.

## Context

Pinokio is focused on packaging and running AI applications. Telegram Intersect is a conventional
self-hosted web application, so maintaining a Pinokio launcher adds a distribution surface that does
not fit the product.

## Decision

Remove the Pinokio manifest, launcher scripts, launcher-specific icon, tests, ignore rules, and user
documentation. Keep the existing Node.js development, production, and hosted deployment paths.
Move the application package from `app/` to the repository root because the separate directory no
longer serves a packaging boundary.

Remove Telegram Intersect from Pinokio publication or local registration if such an entry exists.

## Consequences

- Node.js 24 and npm are the supported local runtime and package manager.
- Development and production commands run directly from the repository root.
- Users run the documented npm commands directly or deploy behind the documented HTTPS reverse proxy.
- Pinokio lifecycle behavior is no longer a release gate or test responsibility.
- Decisions 0001 and 0002 remain historical records, but their Pinokio-specific parts are superseded.
