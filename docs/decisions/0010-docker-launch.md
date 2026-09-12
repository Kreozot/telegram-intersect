# Decision 0010: Local Docker launch path

Status: ACCEPTED — requested by the owner on 2026-09-12.
Date: 2026-09-12.

## Decision

Provide a multi-stage production Docker image and a Docker Compose configuration. The image builds
with the pinned Node.js 24 major, installs only production dependencies in its runtime stage, runs as
the unprivileged `node` user, and stores application data in a named volume.

Compose publishes the application port only on the host's `127.0.0.1` interface. The process must
listen on the container interface, so Compose explicitly enables `LOOPBACK_PROXY`. This setting
preserves automatic local-owner access behind the container boundary and bypasses the remote-binding
startup requirement only; Host, Origin, and mutation-header checks remain active.

## Consequences

- Docker users can run the production build without installing Node.js or npm on the host.
- Container replacement preserves the SQLite database, generated encryption key, cached avatars,
  scan checkpoints, and Telegram authorization in the named volume.
- `LOOPBACK_PROXY` is safe only when the published host port is restricted to loopback. It must not
  be used for remote or publicly bound deployments.
- Hosted containers continue to require an HTTPS reverse proxy, `PUBLIC_ORIGIN`, `APP_ACCESS_KEY`,
  and `SESSION_ENCRYPTION_KEY` under the existing security model.
