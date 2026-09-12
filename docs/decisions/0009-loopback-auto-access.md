# Decision 0009: Automatic loopback owner access

Status: ACCEPTED — owner approved on 2026-09-12.
Date: 2026-09-12.

## Decision

Authorize the owner automatically when the application runs without `PUBLIC_ORIGIN` on its default
loopback boundary. Do not generate or request an access key in this mode. Continue enforcing the
loopback Host allowlist, same-origin validation, and the custom header required for API mutations.

Keep access-key login, rate limiting, 12-hour in-memory browser sessions, secure cookies, and the
explicit Lock action for hosted mode. Hosted mode remains identified by an exact HTTPS
`PUBLIC_ORIGIN`, and non-loopback binding still requires explicitly configured secrets.

## Consequences

- Opening or restarting a local-only installation no longer requires copying a key from a file.
- Other users and processes running under the same computer account are inside the local trust
  boundary and may reach the loopback application.
- Unrelated websites remain unable to read API responses through CORS or perform protected mutations
  because origin validation and the custom request header still apply.
- Operators who expose the application beyond loopback must configure hosted mode and authenticate.

This supersedes Decision 0002 only where it required access-key sessions for local loopback use.
